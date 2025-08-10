let purchasedList = JSON.parse(localStorage.getItem('purchasedList')) || [];
let currentTarget = null;
let comiketData = { wantToBuy: [] }; // Initialize with empty array

const labelOptions = {
    '東456': 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨ'.split(''),
    '東7': 'ABCDEFGHIJKLMNOPQRSTUVW'.split(''),
    '西12': 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめ'.split(''),
    '南12': 'abcdefghijklmnopqrst'.split('')
};

// --- Data Loading and Initialization ---
async function loadDataAndInitialize() {
    const webAppURL = 'https://script.google.com/macros/s/AKfycbzETF2Hl4rsLBObOcpK736wiavYput5AsXdyUIl9czz8NgW9mFkrksKtLy8sZDbE5A/exec';
    try {
        const response = await fetch(webAppURL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        comiketData.wantToBuy = data.wantToBuy || [];
        updateRemainingCounts();
    } catch (error) {
        console.error('Error loading sheet data via Apps Script:', error);
        document.getElementById('loading').textContent = 'データの読み込みに失敗しました。';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateLabelOptions();
    loadDataAndInitialize();
});

// --- UI Event Handlers ---
document.getElementById('current-ewsn').addEventListener('change', updateLabelOptions);

document.getElementById('purchased-btn').addEventListener('click', () => {
    if (!currentTarget || !currentTarget.space) return;

    const spaceToUpdate = currentTarget.space;

    // --- Fire-and-forget Request ---
    // Update the sheet in the background. We don't wait for the response.
    // We only log the result for debugging, without alerting the user.
    const webAppURL = 'https://script.google.com/macros/s/AKfycbzETF2Hl4rsLBObOcpK736wiavYput5AsXdyUIl9czz8NgW9mFkrksKtLy8sZDbE5A/exec';
    fetch(webAppURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ space: spaceToUpdate })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status !== 'success') {
            console.error('Background sheet update failed:', data.message);
        } else {
            console.log(`Background sheet update successful for ${spaceToUpdate}.`);
        }
    })
    .catch(error => {
        console.error('Background sheet update fetch failed:', error);
    });

    // --- Immediate UI Update ---
    const purchasedBtn = document.getElementById('purchased-btn');
    purchasedBtn.disabled = true; // Briefly disable to prevent double-clicks

    // Update local data immediately
    comiketData.wantToBuy = comiketData.wantToBuy.filter(c => c.space !== spaceToUpdate);
    purchasedList.push(spaceToUpdate);
    localStorage.setItem('purchasedList', JSON.stringify(purchasedList));
    
    const [ewsn, label, number] = distinct_space(spaceToUpdate);
    document.getElementById('current-ewsn').value = ewsn;
    updateLabelOptions();
    document.getElementById('current-label').value = label;
    document.getElementById('current-number').value = number;

    // Recalculate and display the next target almost instantly
    updateNextTarget();

    // Re-enable the button after a short delay
    setTimeout(() => {
        purchasedBtn.disabled = false;
    }, 500);
});

document.getElementById('undo-btn').addEventListener('click', () => {
    if (purchasedList.length > 0) {
        purchasedList.pop();
        localStorage.setItem('purchasedList', JSON.stringify(purchasedList));
        // To reflect the change, we need to reload data from the sheet
        loadDataAndInitialize().then(updateNextTarget);
    }
});

document.getElementById('reset-list-btn').addEventListener('click', () => {
    if (confirm('購入リストを完全にリセットしますか？（スプレッドシートの情報はリセットされません）')) {
        purchasedList = [];
        localStorage.removeItem('purchasedList');
        loadDataAndInitialize().then(updateNextTarget);
    }
});

// --- Core Logic ---

function updateNextTarget() {
    const currentEWSN = document.getElementById('current-ewsn').value;
    const currentLabel = document.getElementById('current-label').value;
    const currentNumberStr = document.getElementById('current-number').value;

    document.getElementById('loading').textContent = '最適ルートを検索中...';
    document.getElementById('target-info').style.display = 'block';
    document.querySelector('.target-details').style.display = 'none';
    document.getElementById('target-tweet-container').style.display = 'none';

    const remainingCircles = comiketData.wantToBuy.filter(c => !purchasedList.includes(c.space));

    if (remainingCircles.length === 0) {
        document.getElementById('loading').textContent = "完了";
        return;
    }

    // Use a timeout to allow the UI to update before the potentially long calculation
    setTimeout(() => {
        const startNode = {
            space: `${currentEWSN[0]}${currentLabel}${currentNumberStr}`,
            isStart: true
        };
        const nodesForTsp = [startNode, ...remainingCircles];
        const optimalPath = solveTsp(nodesForTsp);

        const nextCircle = optimalPath.length > 1 ? optimalPath[1] : null;
        if (!nextCircle) {
            document.getElementById('loading').textContent = "完了";
            return;
        }

        currentTarget = nextCircle;
        const [startHall, startLabel, startNum] = distinct_space(startNode.space);
        const [nextHall, nextLabel, nextNum] = distinct_space(nextCircle.space);
        nextCircle.distance = calc_dist(startHall[0], startLabel, parseFloat(startNum), nextHall[0], nextLabel, parseFloat(nextNum));

        // Update UI with the next target
        document.getElementById('loading').textContent = '';
        document.querySelector('.target-details').style.display = 'block';
        document.getElementById('target-tweet-container').style.display = 'block';
        document.getElementById('target-space').textContent = nextCircle.space;
        document.getElementById('target-distance').textContent = nextCircle.distance;
        const userLink = document.getElementById('target-user');
        if (nextCircle.user) {
            userLink.textContent = nextCircle.user.split('/').pop();
            userLink.href = nextCircle.user;
        } else {
            userLink.textContent = 'N/A';
            userLink.href = '#';
        }
        const tweetContainer = document.getElementById('target-tweet-container');
        tweetContainer.innerHTML = '';
        if (nextCircle.tweet && typeof twttr !== 'undefined' && twttr.widgets) {
            const tweetIdMatch = nextCircle.tweet.match(/status\/(\d+)/);
            if (tweetIdMatch && tweetIdMatch[1]) {
                twttr.widgets.createTweet(tweetIdMatch[1], tweetContainer, { theme: 'light' })
                    .catch(err => { console.error('Failed to embed tweet:', err); tweetContainer.innerHTML = '<p>ツイートの埋め込みに失敗しました。</p>'; });
            } else {
                tweetContainer.innerHTML = `<p><a href="${nextCircle.tweet}" target="_blank">お品書きツイートを見る</a></p>`;
            }
        } else if (nextCircle.tweet) {
            tweetContainer.innerHTML = `<p><a href="${nextCircle.tweet}" target="_blank">お品書きツイートを見る</a></p>`;
        } else {
            tweetContainer.innerHTML = '<p>お品書き情報なし</p>';
        }
        updateRemainingCounts();
    }, 10);
}

// --- TSP Solver (2-opt Heuristic) ---
function solveTsp(nodes) {
    if (nodes.length < 2) return nodes;
    nodes.forEach((node, i) => node.__id = i);

    const distMatrix = [];
    for (let i = 0; i < nodes.length; i++) {
        distMatrix[i] = [];
        for (let j = 0; j < nodes.length; j++) {
            if (i === j) { distMatrix[i][j] = 0; continue; }
            const [ewsn1, label1, num1] = distinct_space(nodes[i].space);
            const [ewsn2, label2, num2] = distinct_space(nodes[j].space);
            distMatrix[i][j] = calc_dist(ewsn1[0], label1, parseFloat(num1), ewsn2[0], label2, parseFloat(num2));
        }
    }

    let currentPath = [];
    let remainingNodes = [...nodes];
    let currentNode = remainingNodes.find(n => n.isStart) || remainingNodes.shift();
    currentPath.push(currentNode);
    remainingNodes = remainingNodes.filter(n => n.__id !== currentNode.__id);

    while (remainingNodes.length > 0) {
        let nearestNode = null, minDistance = Infinity;
        for (const node of remainingNodes) {
            const distance = distMatrix[currentNode.__id][node.__id];
            if (distance < minDistance) { minDistance = distance; nearestNode = node; }
        }
        currentNode = nearestNode;
        currentPath.push(currentNode);
        remainingNodes = remainingNodes.filter(n => n.__id !== currentNode.__id);
    }

    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 1; i < currentPath.length - 2; i++) {
            for (let j = i + 1; j < currentPath.length - 1; j++) {
                const d1 = distMatrix[currentPath[i - 1].__id][currentPath[i].__id] + distMatrix[currentPath[j].__id][currentPath[j + 1].__id];
                const d2 = distMatrix[currentPath[i - 1].__id][currentPath[j].__id] + distMatrix[currentPath[i].__id][currentPath[j + 1].__id];
                if (d2 < d1) {
                    const pathSegment = currentPath.slice(i, j + 1).reverse();
                    currentPath = currentPath.slice(0, i).concat(pathSegment).concat(currentPath.slice(j + 1));
                    improved = true;
                }
            }
        }
    }

    nodes.forEach(node => delete node.__id);
    return currentPath;
}

// --- Utility Functions ---
function updateLabelOptions() {
    const hallSelect = document.getElementById('current-ewsn');
    const labelSelect = document.getElementById('current-label');
    const selectedHall = hallSelect.value;
    labelSelect.innerHTML = '';
    const options = labelOptions[selectedHall] || [];
    options.forEach(optionValue => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        labelSelect.appendChild(option);
    });
}

function toHalfWidth(str) {
    if (!str) return '';
    return str.replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}

function distinct_space(space) {
    if (!space) return ['', '', ''];
    let ewsnChar = space[0];
    let labelChar = space[1];
    let numberPart = toHalfWidth(space.substring(2));
    let hallGroupKey = '';
    for (const key in labelOptions) {
        if (key.startsWith(ewsnChar) && labelOptions[key].includes(labelChar)) {
            hallGroupKey = key;
            break;
        }
    }
    let number = '';
    for (let i = 0; i < numberPart.length; i++) {
        const char = numberPart[i];
        if (char >= '0' && char <= '9') number += char;
        else break;
    }
    return [hallGroupKey, labelChar, number];
}

function calc_dist(ewsn1, label1, number1, ewsn2, label2, number2) {
    if (number1 > 32) number1 = 64 - number1;
    if (number2 > 32) number2 = 64 - number2;
    if (ewsn1 !== ewsn2) return 1e9;
    const labelDist = Math.abs(label1.charCodeAt(0) - label2.charCodeAt(0));
    const numberDist = Math.abs(number1 - number2);
    return labelDist * 4 + numberDist;
}

function updateRemainingCounts() {
    const unvisitedCircles = comiketData.wantToBuy.filter(c => !purchasedList.includes(c.space));
    const counts = { '東456': 0, '東7': 0, '西12': 0, '南12': 0 };
    unvisitedCircles.forEach(circle => {
        const [ewsn, label, _number] = distinct_space(circle.space);
        for (const groupKey in labelOptions) {
            if (groupKey.startsWith(ewsn) && labelOptions[groupKey].includes(label)) {
                counts[groupKey]++;
                break;
            }
        }
    });
    document.getElementById('count-E456').textContent = counts['東456'];
    document.getElementById('count-E7').textContent = counts['東7'];
    document.getElementById('count-W12').textContent = counts['西12'];
    document.getElementById('count-S12').textContent = counts['南12'];
}