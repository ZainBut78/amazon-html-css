 // DOM Elements
const themeToggle = document.getElementById('themeToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');
const calculateBtn = document.getElementById('calculateBtn');
const convertBtn = document.getElementById('convertBtn');
const compareBtn = document.getElementById('compareBtn');
const roiResults = document.getElementById('roiResults');
const shareResultsBtn = document.getElementById('shareResultsBtn');
const tickerContent = document.getElementById('tickerContent');
const currentYearSpan = document.getElementById('currentYear');

// Global variables
let cryptoData = {};
let exchangeRates = {};
let comparisonChart = null;
let isAPILoading = false;

// API Configuration
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_API_URL = 'https://pro-api.coingecko.com/api/v3';
const EXCHANGERATE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const CRYPTOCOMPARE_API_URL = 'https://min-api.cryptocompare.com/data';

// Alternative API (if CoinGecko fails)
const ALTERNATIVE_API_URL = 'https://api.coincap.io/v2/assets';

// Crypto IDs for CoinGecko API
const CRYPTO_IDS = {
    bitcoin: 'bitcoin',
    ethereum: 'ethereum',
    solana: 'solana',
    cardano: 'cardano',
    polkadot: 'polkadot',
    dogecoin: 'dogecoin'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    currentYearSpan.textContent = new Date().getFullYear();
    
    // Initialize theme
    initTheme();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize chart
    initializeCharts();
    
    // Fetch data on page load
    fetchAllData();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else {
        enableLightMode();
    }
}

function enableDarkMode() {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.classList.remove('light-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', 'dark');
}

function enableLightMode() {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', 'light');
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', function() {
        if (document.documentElement.classList.contains('dark-mode')) {
            enableLightMode();
        } else {
            enableDarkMode();
        }
    });
    
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        mobileMenuBtn.innerHTML = navLinks.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
    
    // Calculate ROI
    calculateBtn.addEventListener('click', calculateROI);
    
    // Convert price
    convertBtn.addEventListener('click', convertPrice);
    
    // Compare coins
    compareBtn.addEventListener('click', compareCoins);
    
    // Share results
    shareResultsBtn.addEventListener('click', shareResults);
    
    // Legal links
    document.getElementById('disclaimerLink').addEventListener('click', showDisclaimer);
    document.getElementById('privacyLink').addEventListener('click', showPrivacyPolicy);
    document.getElementById('termsLink').addEventListener('click', showTerms);
}

// Fetch all data from APIs
async function fetchAllData() {
    if (isAPILoading) return;
    
    isAPILoading = true;
    
    try {
        // Update ticker with loading message
        updateTickerWithLoading();
        
        // Fetch crypto data from multiple sources
        await fetchCryptoDataFromMultipleSources();
        
        // Fetch exchange rates
        await fetchExchangeRates();
        
        // Update UI with fetched data
        updateUIWithLiveData();
        
        // Auto-calculate with live data
        setTimeout(() => {
            calculateROI();
            convertPrice();
        }, 1000);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        
        // Use fallback data
        useFallbackData();
        updateUIWithLiveData();
        
        // Still try to calculate with fallback data
        calculateROI();
        convertPrice();
    } finally {
        isAPILoading = false;
        
        // Set up automatic refresh every 60 seconds
        setTimeout(fetchAllData, 60000);
    }
}

// Update ticker with loading message
function updateTickerWithLoading() {
    tickerContent.innerHTML = `
        <div class="ticker-item">
            <i class="fas fa-spinner fa-spin"></i> Loading live prices...
        </div>
    `;
}

// Fetch crypto data from multiple sources
async function fetchCryptoDataFromMultipleSources() {
    // Try CoinGecko first
    try {
        await fetchCryptoDataFromCoinGecko();
        return;
    } catch (error) {
        console.log('CoinGecko failed, trying alternative...');
    }
    
    // Try CryptoCompare
    try {
        await fetchCryptoDataFromCryptoCompare();
        return;
    } catch (error) {
        console.log('CryptoCompare failed, trying alternative...');
    }
    
    // Try CoinCap as last resort
    try {
        await fetchCryptoDataFromCoinCap();
        return;
    } catch (error) {
        console.log('All APIs failed, using fallback data');
        throw new Error('All APIs failed');
    }
}

// Fetch crypto data from CoinGecko
async function fetchCryptoDataFromCoinGecko() {
    const ids = Object.values(CRYPTO_IDS).join(',');
    const url = `${COINGECKO_API_URL}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`CoinGecko API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update cryptoData object with real data
    cryptoData = {};
    
    data.forEach(coin => {
        const coinId = getKeyByValue(CRYPTO_IDS, coin.id);
        if (coinId) {
            cryptoData[coinId] = {
                name: coin.name,
                symbol: coin.symbol.toUpperCase(),
                price: coin.current_price,
                change24h: coin.price_change_percentage_24h || 0,
                marketCap: coin.market_cap,
                volume: coin.total_volume,
                annualGrowth: getAnnualGrowthRate(coinId),
                color: getCoinColor(coinId),
                lastUpdated: new Date().toISOString()
            };
        }
    });
}

// Fetch crypto data from CryptoCompare
async function fetchCryptoDataFromCryptoCompare() {
    const symbols = Object.keys(CRYPTO_IDS).map(id => id.toUpperCase());
    const fsyms = symbols.join(',');
    const url = `${CRYPTOCOMPARE_API_URL}/pricemultifull?fsyms=${fsyms}&tsyms=USD`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`CryptoCompare API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update cryptoData object
    cryptoData = {};
    
    Object.keys(CRYPTO_IDS).forEach(coinId => {
        const coinSymbol = coinId.toUpperCase();
        const coinData = data.RAW?.[coinSymbol]?.USD;
        
        if (coinData) {
            cryptoData[coinId] = {
                name: getCoinName(coinId),
                symbol: coinSymbol,
                price: coinData.PRICE,
                change24h: coinData.CHANGEPCT24HOUR || 0,
                marketCap: coinData.MKTCAP,
                volume: coinData.TOTALVOLUME24HTO,
                annualGrowth: getAnnualGrowthRate(coinId),
                color: getCoinColor(coinId),
                lastUpdated: new Date().toISOString()
            };
        }
    });
}

// Fetch crypto data from CoinCap
async function fetchCryptoDataFromCoinCap() {
    const ids = Object.keys(CRYPTO_IDS);
    const url = `${ALTERNATIVE_API_URL}?ids=${ids.join(',')}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`CoinCap API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update cryptoData object
    cryptoData = {};
    
    data.data.forEach(coin => {
        const coinId = coin.id.toLowerCase();
        if (CRYPTO_IDS[coinId]) {
            cryptoData[coinId] = {
                name: coin.name,
                symbol: coin.symbol,
                price: parseFloat(coin.priceUsd),
                change24h: parseFloat(coin.changePercent24Hr) || 0,
                marketCap: parseFloat(coin.marketCapUsd),
                volume: parseFloat(coin.volumeUsd24Hr),
                annualGrowth: getAnnualGrowthRate(coinId),
                color: getCoinColor(coinId),
                lastUpdated: new Date().toISOString()
            };
        }
    });
}

// Helper function to get key by value
function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

// Get coin name
function getCoinName(coinId) {
    const names = {
        bitcoin: "Bitcoin",
        ethereum: "Ethereum",
        solana: "Solana",
        cardano: "Cardano",
        polkadot: "Polkadot",
        dogecoin: "Dogecoin"
    };
    return names[coinId] || coinId.charAt(0).toUpperCase() + coinId.slice(1);
}

// Get annual growth rate based on historical data
function getAnnualGrowthRate(coinId) {
    const growthRates = {
        bitcoin: 65,
        ethereum: 55,
        solana: 120,
        cardano: 35,
        polkadot: 40,
        dogecoin: 25
    };
    return growthRates[coinId] || 50; // Default to 50% if not found
}

// Get coin color
function getCoinColor(coinId) {
    const colors = {
        bitcoin: "#F7931A",
        ethereum: "#627EEA",
        solana: "#00FFA3",
        cardano: "#0033AD",
        polkadot: "#E6007A",
        dogecoin: "#C2A633"
    };
    return colors[coinId] || "#0D6EFD"; // Default color
}

// Fetch exchange rates
async function fetchExchangeRates() {
    try {
        const response = await fetch(EXCHANGERATE_API_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch exchange rates');
        }
        
        const data = await response.json();
        exchangeRates = data.rates;
        
        // Ensure USD is always 1
        exchangeRates['usd'] = 1;
        
        // Add PKR if not present (using fallback)
        if (!exchangeRates['pkr']) {
            exchangeRates['pkr'] = 277.50;
        }
        
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        
        // Fallback exchange rates
        exchangeRates = {
            usd: 1,
            pkr: 277.50,
            eur: 0.92,
            gbp: 0.79,
            inr: 83.20,
            aud: 1.52,
            cad: 1.35,
            jpy: 149.50,
            cny: 7.30
        };
    }
}

// Use fallback data if APIs fail
function useFallbackData() {
    cryptoData = {
        bitcoin: { 
            name: "Bitcoin", 
            symbol: "BTC", 
            price: 41250.50, 
            change24h: 2.5,
            annualGrowth: 65,
            color: "#F7931A"
        },
        ethereum: { 
            name: "Ethereum", 
            symbol: "ETH", 
            price: 2250.75, 
            change24h: 1.8,
            annualGrowth: 55,
            color: "#627EEA"
        },
        solana: { 
            name: "Solana", 
            symbol: "SOL", 
            price: 95.30, 
            change24h: 5.2,
            annualGrowth: 120,
            color: "#00FFA3"
        },
        cardano: { 
            name: "Cardano", 
            symbol: "ADA", 
            price: 0.45, 
            change24h: -1.2,
            annualGrowth: 35,
            color: "#0033AD"
        },
        polkadot: { 
            name: "Polkadot", 
            symbol: "DOT", 
            price: 6.85, 
            change24h: 0.5,
            annualGrowth: 40,
            color: "#E6007A"
        },
        dogecoin: { 
            name: "Dogecoin", 
            symbol: "DOGE", 
            price: 0.078, 
            change24h: 3.1,
            annualGrowth: 25,
            color: "#C2A633"
        }
    };
}

// Update UI with live data
function updateUIWithLiveData() {
    // Update ticker
    updateTicker();
    
    // Update conversion result if data is available
    if (cryptoData.bitcoin) {
        const btcPrice = cryptoData.bitcoin.price;
        document.getElementById('conversionResult').textContent = 
            `1 BTC = $${btcPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('conversionDetails').textContent = 
            'Bitcoin to US Dollar conversion (Live)';
    }
}

// Update price ticker
function updateTicker() {
    if (Object.keys(cryptoData).length === 0) {
        tickerContent.innerHTML = '<div class="ticker-item">No crypto data available</div>';
        return;
    }
    
    let tickerHTML = '';
    let count = 0;
    
    for (const [key, crypto] of Object.entries(cryptoData)) {
        if (count >= 6) break; // Show max 6 coins in ticker
        
        const changeClass = crypto.change24h >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.change24h >= 0 ? '+' : '';
        
        tickerHTML += `
            <div class="ticker-item">
                ${crypto.symbol}: $${crypto.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                <span class="${changeClass}">${changeSign}${crypto.change24h.toFixed(2)}%</span>
            </div>
        `;
        
        count++;
    }
    
    // Duplicate content for seamless looping
    tickerContent.innerHTML = tickerHTML + tickerHTML;
}

// ROI Calculator with live data
function calculateROI() {
    const cryptoSelect = document.getElementById('cryptoSelect').value;
    const investmentAmount = parseFloat(document.getElementById('investmentAmount').value);
    const timePeriod = parseInt(document.getElementById('timePeriod').value);
    const growthRate = parseFloat(document.getElementById('growthRate').value) / 100;
    const currencySelect = document.getElementById('currencySelect').value;
    
    const crypto = cryptoData[cryptoSelect];
    
    if (!crypto) {
        alert('Please wait for cryptocurrency data to load or refresh the page.');
        return;
    }
    
    // Get exchange rate for selected currency
    const exchangeRate = exchangeRates[currencySelect.toLowerCase()] || 1;
    
    // Convert investment to USD for calculations
    const investmentUSD = investmentAmount / exchangeRate;
    
    // Calculate ROI
    const years = timePeriod / 365;
    const projectedValueUSD = investmentUSD * Math.pow(1 + growthRate, years);
    const totalProfitUSD = projectedValueUSD - investmentUSD;
    const roiPercentage = (totalProfitUSD / investmentUSD) * 100;
    
    // Convert back to selected currency for display
    const currencyCode = currencySelect.toUpperCase();
    const investmentDisplay = (investmentAmount).toLocaleString('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    const projectedValueDisplay = (projectedValueUSD * exchangeRate).toLocaleString('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    const totalProfitDisplay = (totalProfitUSD * exchangeRate).toLocaleString('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Update UI
    document.getElementById('initialInvestment').textContent = investmentDisplay;
    document.getElementById('projectedValue').textContent = projectedValueDisplay;
    document.getElementById('totalProfit').textContent = totalProfitDisplay;
    document.getElementById('totalProfit').className = totalProfitUSD >= 0 ? 'result-value positive' : 'result-value negative';
    document.getElementById('roiPercentage').textContent = `${roiPercentage.toFixed(2)}%`;
    document.getElementById('roiPercentage').className = roiPercentage >= 0 ? 'result-value positive' : 'result-value negative';
    
    // Show results
    roiResults.classList.remove('hidden');
}

// Price Converter with live data
function convertPrice() {
    const cryptoSelect = document.getElementById('convertCrypto').value;
    const amount = parseFloat(document.getElementById('convertAmount').value);
    const currencySelect = document.getElementById('convertCurrency').value;
    
    const crypto = cryptoData[cryptoSelect];
    
    if (!crypto) {
        alert('Please wait for cryptocurrency data to load or refresh the page.');
        return;
    }
    
    // Get exchange rate for selected currency
    const exchangeRate = exchangeRates[currencySelect.toLowerCase()] || 1;
    
    // Calculate conversion
    const valueInUSD = amount * crypto.price;
    const valueInTargetCurrency = valueInUSD * exchangeRate;
    
    // Format for display
    const currencySymbols = {
        usd: '$',
        eur: '€',
        gbp: '£',
        pkr: 'Rs ',
        inr: '₹',
        aud: 'A$',
        cad: 'C$',
        jpy: '¥',
        cny: '¥'
    };
    
    const currencySymbol = currencySymbols[currencySelect.toLowerCase()] || '$';
    
    const formattedAmount = amount.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 8});
    const formattedValue = valueInTargetCurrency.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    // Update UI
    document.getElementById('conversionResult').textContent = 
        `${formattedAmount} ${crypto.symbol} = ${currencySymbol}${formattedValue}`;
        
    document.getElementById('conversionDetails').textContent = 
        `${crypto.name} to ${currencySelect.toUpperCase()} conversion (Live Rate)`;
}

// Coin Comparison with live data
function compareCoins() {
    const investmentAmount = parseFloat(document.getElementById('compareAmount').value);
    const timePeriod = parseInt(document.getElementById('comparePeriod').value);
    const selectedCoins = Array.from(document.querySelectorAll('.coin-checkbox:checked')).map(cb => cb.value);
    
    const comparisonResults = document.getElementById('comparisonResults');
    
    // Check if we have data
    if (Object.keys(cryptoData).length === 0) {
        comparisonResults.innerHTML = '<div class="text-center">Loading cryptocurrency data...</div>';
        return;
    }
    
    // Clear previous results
    comparisonResults.innerHTML = '';
    
    // Calculate for each selected coin
    selectedCoins.forEach((coinId, index) => {
        const crypto = cryptoData[coinId];
        
        if (!crypto) {
            return; // Skip if coin data not available
        }
        
        const years = timePeriod / 365;
        const growthRate = crypto.annualGrowth / 100;
        
        const projectedValue = investmentAmount * Math.pow(1 + growthRate, years);
        const profit = projectedValue - investmentAmount;
        const roiPercentage = (profit / investmentAmount) * 100;
        
        // Create coin card
        const coinCard = document.createElement('div');
        coinCard.className = 'coin-card';
        coinCard.innerHTML = `
            <div class="coin-header">
                <div class="coin-icon" style="background-color: ${crypto.color}">
                    ${crypto.symbol.charAt(0)}
                </div>
                <div>
                    <div class="coin-name">${crypto.name}</div>
                    <div class="coin-symbol">${crypto.symbol}</div>
                </div>
            </div>
            
            <div class="coin-stats">
                <div>Current Price:</div>
                <div>$${crypto.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            
            <div class="coin-stats">
                <div>24h Change:</div>
                <div class="${crypto.change24h >= 0 ? 'positive' : 'negative'}">
                    ${crypto.change24h >= 0 ? '+' : ''}${crypto.change24h.toFixed(2)}%
                </div>
            </div>
            
            <div class="coin-stats">
                <div>Projected Value:</div>
                <div class="positive">$${projectedValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            
            <div class="coin-stats">
                <div>Total Profit:</div>
                <div class="positive">$${profit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            
            <div class="coin-stats">
                <div>ROI:</div>
                <div class="positive">${roiPercentage.toFixed(2)}%</div>
            </div>
        `;
        
        comparisonResults.appendChild(coinCard);
    });
    
    // Update comparison chart
    updateComparisonChart(selectedCoins, investmentAmount, timePeriod);
}

// Initialize charts
function initializeCharts() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }
    
    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Projected Value ($)',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
                    },
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                    }
                }
            }
        }
    });
}

// Update comparison chart
function updateComparisonChart(selectedCoins, investmentAmount, timePeriod) {
    if (!comparisonChart) {
        initializeCharts();
    }
    
    const labels = [];
    const data = [];
    const colors = [];
    
    selectedCoins.forEach(coinId => {
        const crypto = cryptoData[coinId];
        
        if (!crypto) return;
        
        const years = timePeriod / 365;
        const growthRate = crypto.annualGrowth / 100;
        const projectedValue = investmentAmount * Math.pow(1 + growthRate, years);
        
        labels.push(crypto.symbol);
        data.push(projectedValue);
        colors.push(crypto.color);
    });
    
    comparisonChart.data.labels = labels;
    comparisonChart.data.datasets[0].data = data;
    comparisonChart.data.datasets[0].backgroundColor = colors;
    comparisonChart.data.datasets[0].borderColor = colors;
    comparisonChart.update();
}

// Share results
function shareResults() {
    const cryptoSelect = document.getElementById('cryptoSelect').value;
    const crypto = cryptoData[cryptoSelect];
    const investmentAmount = document.getElementById('initialInvestment').textContent;
    const projectedValue = document.getElementById('projectedValue').textContent;
    
    const shareText = `Check out my crypto investment projection: ${investmentAmount} in ${crypto.name} could grow to ${projectedValue} in one year! Calculated with CryptoCalc.`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Crypto Investment Projection',
            text: shareText,
            url: window.location.href
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        });
    }
}

// Legal pages
function showDisclaimer() {
    alert(`DISCLAIMER:\n\nAll calculations and projections provided by CryptoCalc are for informational and educational purposes only. They are based on historical data and assumed growth rates, which may not reflect future performance.\n\nCryptocurrency investments are highly volatile and involve substantial risk. You should consult with a qualified financial advisor before making any investment decisions.\n\nCryptoCalc is not responsible for any investment losses or decisions made based on the information provided by this tool.`);
}

function showPrivacyPolicy() {
    alert(`PRIVACY POLICY:\n\nCryptoCalc respects your privacy. We do not collect any personal information. All calculations are performed locally in your browser.\n\nWe use Google AdSense to display advertisements, which may use cookies to personalize ads. You can review Google's privacy policy for more information.\n\nWe do not store any investment data or personal information on our servers.`);
}

function showTerms() {
    alert(`TERMS OF SERVICE:\n\nBy using CryptoCalc, you agree that:\n\n1. All calculations are for informational purposes only.\n2. You will not rely solely on this tool for investment decisions.\n3. You are responsible for your own investment research and decisions.\n4. We are not liable for any losses resulting from the use of this tool.\n5. We reserve the right to modify or discontinue the service at any time.`);
}

// Manual refresh function
function refreshData() {
    fetchAllData();
    alert('Refreshing cryptocurrency data...');
}

// Add refresh button functionality
document.addEventListener('DOMContentLoaded', function() {
    // You can add a refresh button in your HTML if needed
    // <button onclick="refreshData()" class="btn btn-secondary">Refresh Data</button>
});