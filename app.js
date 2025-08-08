// localStorageから購入済みリストを読み込む。データがなければ空の配列を使う。
let purchasedList = JSON.parse(localStorage.getItem('purchasedList')) || [];
let currentTarget = null;

const labelOptions = {
    '東456': 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨ'.split(''),
    '東7': 'ABCDEFGHIJKLMNOPQRSTUVW'.split(''),
    '西12': 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめ'.split(''),
    '南12': 'abcdefghijklmnopqrst'.split('')
};

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
// 1. ページの読み込みが完了した時点で、最初のドロップダウンを生成する
document.addEventListener('DOMContentLoaded', () => {
    updateLabelOptions();
    updateRemainingCounts();
});
// 2. 「東西南北」の選択が変更されたら、識別子リストを更新する
document.getElementById('current-ewsn').addEventListener('change', updateLabelOptions);


/**
 * 全角英数字を半角に変換する関数
 * @param {string} str - 変換したい文字列
 * @returns {string} 半角に変換された文字列
 */
function toHalfWidth(str) {
    return str.replace(/[！-～]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

function distinct_space(space){
  let ewsnChar = space[0]; // '東', '西', '南'
  let labelChar = space[1]; // 'A', 'あ', 'a'
  let numberPart = space.substring(2); // '1a', '12b' など

  // ホールグループキー (例: '東456') を特定
  let hallGroupKey = '';
  for (const key in labelOptions) {
      if (key.startsWith(ewsnChar) && labelOptions[key].includes(labelChar)) {
          hallGroupKey = key;
          break;
      }
  }

  // 番号部分から数字のみを抽出
  let number = '';
  for (let i = 0; i < numberPart.length; i++) {
      const char = numberPart[i];
      if (char >= '0' && char <= '9') {
          number += char;
      } else {
          break; // 数字以外の文字が出たら終了
      }
  }

  return [hallGroupKey, labelChar, number];
}

function updateNextTarget() {
    const currentewsn = (document.getElementById('current-ewsn').value);
    const currentlabel = (document.getElementById('current-label').value);
    
    const numberInput = document.getElementById('current-number').value;
    const currentnumber = parseFloat(toHalfWidth(numberInput));

    document.getElementById('loading').textContent = '検索中...';
    document.getElementById('target-info').style.display = 'none';

    const targetCircles = comiketData.wantToBuy.map(circle => {
        return {
            space: circle.space,
            user: circle.user, // user情報を追加
            tweet: circle.tweet // tweet情報を追加
        };
    }).filter(circle =>
        !purchasedList.includes(circle.space)
    );
    
    const nextCircle = calculateNextCircle(currentewsn, currentlabel, currentnumber,targetCircles);
    currentTarget = nextCircle;

    const targetInfoDiv = document.getElementById('target-info');

    if (nextCircle.message) { 
        document.getElementById('loading').textContent = nextCircle.message;
        // エラーメッセージ表示時はTwitter/お品書きを非表示
        document.getElementById('target-user').textContent = '';
        document.getElementById('target-user').href = '#';
        document.getElementById('target-tweet-container').innerHTML = '';
        targetInfoDiv.style.display = 'none'; // 情報表示エリアを非表示
    } else { // 次の目的地が見つかった場合
        document.getElementById('loading').textContent = '';
        targetInfoDiv.style.display = 'block'; // 情報表示エリアを表示
        document.getElementById('target-space').textContent = nextCircle.space;
        document.getElementById('target-distance').textContent = nextCircle.distance;

        // Twitterアカウントの表示
        const userLink = document.getElementById('target-user');
        if (nextCircle.user) {
            userLink.textContent = nextCircle.user.split('/').pop(); // ユーザー名のみ表示
            userLink.href = nextCircle.user;
        } else {
            userLink.textContent = 'N/A';
            userLink.href = '#';
        }

        // お品書きツイートの埋め込み
        const tweetContainer = document.getElementById('target-tweet-container');
        tweetContainer.innerHTML = ''; // 前のツイートをクリア
        if (nextCircle.tweet && twttr && twttr.widgets) {
            // twttr.widgets.createTweet(tweetId, element, options)
            // ツイートURLからIDを抽出
            const tweetIdMatch = nextCircle.tweet.match(/status\/(\d+)/);
            if (tweetIdMatch && tweetIdMatch[1]) {
                twttr.widgets.createTweet(
                    tweetIdMatch[1], // ツイートID
                    tweetContainer, // 埋め込む要素
                    { theme: 'light' } // オプション（ダークモードなど）
                ).then(() => {
                    // ツイート埋め込み成功時の処理（必要であれば）
                }).catch(err => {
                    console.error('Failed to embed tweet:', err);
                    tweetContainer.innerHTML = '<p>ツイートの埋め込みに失敗しました。</p>';
                });
            } else {
                tweetContainer.innerHTML = '<p><a href="' + nextCircle.tweet + '" target="_blank">お品書きツイートを見る</a></p>';
            }
        } else if (nextCircle.tweet) {
            // twttrオブジェクトがまだロードされていない場合や、widgetsがない場合
            tweetContainer.innerHTML = '<p><a href="' + nextCircle.tweet + '" target="_blank">お品書きツイートを見る</a></p>';
        } else {
            tweetContainer.innerHTML = '<p>お品書き情報なし</p>';
        }
    }
    updateRemainingCounts(); // 残りサークル数を更新
}

//購入完了時の処理
document.getElementById('purchased-btn').addEventListener('click', () => {
    if (currentTarget && currentTarget.space) {
        purchasedList.push(currentTarget.space);
        localStorage.setItem('purchasedList', JSON.stringify(purchasedList));

        // 現在地を今いたサークルの場所に更新
        const [ewsn, label, number] = distinct_space(currentTarget.space);
        document.getElementById('current-ewsn').value = ewsn;

        // 識別子ドロップダウンを更新（新しいホールに合わせて）
        updateLabelOptions();

        document.getElementById('current-label').value = label;
        document.getElementById('current-number').value = number;
        
        updateNextTarget();
    }
});


function undoLastPurchase() {
    if (purchasedList.length > 0) {
        purchasedList.pop();
        localStorage.setItem('purchasedList', JSON.stringify(purchasedList));
        updateNextTarget();
    }
}

function resetPurchasedList() {
    if (confirm('購入リストを完全にリセットしてもよろしいですか？')) {
        purchasedList = [];
        localStorage.removeItem('purchasedList');
        updateNextTarget();
    }
}
document.getElementById('undo-btn').addEventListener('click', undoLastPurchase);
document.getElementById('reset-list-btn').addEventListener('click', resetPurchasedList);


function calc_dist(ewsn1, label1, number1, ewsn2, label2, number2) {
  if (number1 > 32) number1 = 64 - number1;
  if (number2 > 32) number2 = 64 - number2;
  if (ewsn1.charAt(0) !== ewsn2.charAt(0)) {
      return 1e9;
  }
  const labelDist = Math.abs(label1.charCodeAt(0) - label2.charCodeAt(0));
  const numberDist = Math.abs(number1 - number2);
  const dist = labelDist * 4 + numberDist;
  return dist;
}


function calculateNextCircle(currentewsn, currentlabel, currentnumber,targets) {
  if (targets.length === 0) {
    return { message: "完了" };
  }

  let nearestCircle = null;
  let minDistance = 5e9;

  targets.forEach(circle => {
    const [targetewsn, targetlabel, targetnumberStr] = distinct_space(circle.space);
    const targetnumber = parseFloat(targetnumberStr); // 文字列を数値に変換
    const distance = calc_dist(currentewsn.charAt(0), currentlabel, currentnumber, targetewsn, targetlabel, targetnumber);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCircle = circle;
    }
  });
  if (nearestCircle) {
    return { ...nearestCircle, distance: minDistance };
  }
}

// --- ここから追加 ---
/**
 * ホールグループごとに未訪問のサークル数を計算し、表示を更新する関数
 */
function updateRemainingCounts() {
    // 1. 未訪問のサークルのリストを作成
    const unvisitedCircles = comiketData.wantToBuy.filter(circle => 
        !purchasedList.includes(circle.space)
    );

    // 2. ホールグループごとのカウンターを初期化
    const counts = {
        '東456': 0,
        '東7': 0,
        '西12': 0,
        '南12': 0
    };

    // 3. 未訪問サークルを分類してカウント
    unvisitedCircles.forEach(circle => {
        const [ewsn, label, _number] = distinct_space(circle.space);

        for (const groupKey in labelOptions) { // groupKeyは '東456', '東7' など
            if (groupKey.startsWith(ewsn) && labelOptions[groupKey].includes(label)) {
                counts[groupKey]++;
                break; // 所属が確定したら次のサークルへ
            }
        }
    });

    // 4. 計算結果をHTMLに反映
    document.getElementById('count-E456').textContent = counts['東456'];
    document.getElementById('count-E7').textContent = counts['東7'];
    document.getElementById('count-W12').textContent = counts['西12'];
    document.getElementById('count-S12').textContent = counts['南12'];
}