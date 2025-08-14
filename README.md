# TSP in Comiketland

コミックマーケット（コミケ）会場で、買いたいものがあるサークルを効率的に巡回するためのルート最適化ツールです。

現在地から次に行くべき最も近いサークルを計算し、道順を提案します。TSP（巡回セールスマン問題）のアルゴリズムを利用して、全体の移動距離が短くなるようなルートを探索します。

**[デモページはこちら](httpsd://あなたのGitHubユーザー名.github.io/あなたのリポジトリ名/)**  <!-- TODO: デプロイ後にURLを更新してください -->

## 主な機能

-   **次の目的地を提案**: 現在地から最も効率的な次のサークルを計算して表示します。
-   **ルート最適化**: TSPアルゴリズム（2-opt法）を利用して、巡回ルート全体を最適化します。
-   **Googleスプレッドシート連携**: 訪問したいサークルのリストをGoogleスプレッドシートで管理できます。
-   **お品書き表示**: サークルのTwitterアカウントやお品書きのツイートをアプリ内で直接確認できます。
-   **進捗管理**: 「購入済」ボタンで訪問したサークルを記録し、次の目的地を自動で再計算します。
-   **レスポンシブデザイン**: スマートフォンでの利用に最適化されています。

## 使い方

1.  **現在地を入力**: ホール（例: 東456）、識別子（例: ア）、番号（例: 01）をそれぞれ入力します。
2.  **検索開始**: 「次の目的地を検索」ボタンを押します。
3.  **目的地へ移動**: 計算された次の目的地が表示されます。スペース、距離、Twitter情報を確認して移動します。
4.  **購入完了**: サークルで購入が完了したら、「購入済」ボタンを押します。
5.  **繰り返し**: 次の目的地が自動で計算されるので、3と4を繰り返します。

-   **やり直し**: 間違えてボタンを押した場合は、「一つ前に戻す」ボタンで元に戻せます。
-   **リセット**: 「購入リストをリセット」ボタンで、アプリ上の購入記録をすべてリセットできます（スプレッドシート上のデータは変更されません）。

## 自分のデータで利用する方法

このアプリケーションをフォークし、ご自身の訪問リストを使って利用することができます。

### 1. このリポジトリをフォーク

画面右上にある「Fork」ボタンを押して、ご自身のアカウントにこのリポジトリをコピーします。

### 2. Googleスプレッドシートを準備

1.  新しいGoogleスプレッドシートを作成します。
2.  1行目に見出しとして、A列に `space`、B列に `user`、C列に `tweet`、D列に `purchased_at` と入力します。
    -   `space`: サークルのスペース番号 (例: `東A01a`)
    -   `user`: サークルのTwitter URL (例: `https://twitter.com/okitugu1101`)
    -   `tweet`: お品書きのツイートURL (例: `https://twitter.com/okitugu1101/status/12345`)
    -   `purchased_at`: 購入済みのタイムスタンプ（ここはスクリプトが自動で入力するので空でOK）
3.  2行目以降に、訪問したいサークルの情報を入力します。

| space | user | tweet | purchased_at |
| :--- | :--- | :--- | :--- |
| 東A01a | https://twitter.com/user_a | https://twitter.com/user_a/status/123 | |
| 西き05b| https://twitter.com/user_b | https://twitter.com/user_b/status/456 | |


### 3. Google Apps Script (GAS) を作成・デプロイ

1.  準備したスプレッドシートで、「拡張機能」 > 「Apps Script」を開きます。
2.  開いたエディタに、以下のコードをコピー＆ペーストします。

    ```javascript
    const SHEET_NAME = 'シート1'; // あなたのスプレッドシートのシート名に合わせてください

    function doGet(e) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      const headers = data.shift(); // ヘッダー行を取得

      const spaceCol = headers.indexOf('space');
      const userCol = headers.indexOf('user');
      const tweetCol = headers.indexOf('tweet');
      const purchasedCol = headers.indexOf('purchased_at');

      const wantToBuy = data.filter(row => !row[purchasedCol]) // purchased_atが空の行のみ
                          .map(row => ({
                            space: row[spaceCol],
                            user: row[userCol],
                            tweet: row[tweetCol]
                          }));

      const response = { wantToBuy: wantToBuy };

      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    function doPost(e) {
      try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
        const body = JSON.parse(e.postData.contents);
        const spaceToUpdate = body.space;

        if (!spaceToUpdate) {
          return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Space not provided.'}))
            .setMimeType(ContentService.MimeType.JSON);
        }

        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const spaceCol = headers.indexOf('space');
        const purchasedCol = headers.indexOf('purchased_at');

        for (let i = 1; i < data.length; i++) {
          if (data[i][spaceCol] === spaceToUpdate) {
            sheet.getRange(i + 1, purchasedCol + 1).setValue(new Date());
            return ContentService.createTextOutput(JSON.stringify({status: 'success', message: `Updated ${spaceToUpdate}`}))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Space not found.'}))
            .setMimeType(ContentService.MimeType.JSON);

      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.toString()}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    ```

3.  スクリプトを保存し、右上の「デプロイ」 > 「新しいデプロイ」をクリックします。
4.  「種類の選択」で歯車アイコンを押し、「ウェブアプリ」を選択します。
5.  「アクセスできるユーザー」を **「全員」** に設定します。
6.  「デプロイ」ボタンを押します。
7.  表示された**ウェブアプリのURL**をコピーします。これがAPIのエンドポイントになります。

### 4. アプリケーションのコードを更新

1.  フォークしたご自身のGitHubリポジトリで、`app.js`ファイルを開きます。
2.  ファイル内の以下の行を見つけます。
    ```javascript
    const webAppURL = 'https://script.google.com/macros/s/AKfycbzETF2Hl4rsLBObOcpK736wiavYput5AsXdyUIl9czz8NgW9mFkrksKtLy8sZDbE5A/exec';
    ```
3.  このURLを、先ほどコピーした**ご自身のウェブアプリのURL**に書き換えます。

### 5. GitHub Pagesでデプロイ

1.  リポジトリの「Settings」 > 「Pages」を開きます。
2.  「Source」を `Deploy from a branch` に設定します。
3.  「Branch」を `main`（または `master`）、フォルダを `/(root)` にして「Save」を押します。
4.  少し待つと、ページが公開されます。公開先のURLをこのREADMEのデモリンクに設定しましょう。

## ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。
