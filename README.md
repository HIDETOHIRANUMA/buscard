# わたしのバスカード

いつも乗るバスの「行き」と「帰り」だけを、**定期入れに入るカード・A4シート・スマホの待ち受け画像**にするウェブアプリです。
全国のバスのオープンデータ（GTFS-JP）から、その人専用のバスカードを数回のクリックで作れます。

**アプリを開く：** https://hidetohiranuma.github.io/buscard/

アーバンデータチャレンジ2026 応募作品（作品タイプ：アプリケーション／テーマ：道路・交通）

## こんな人のために

- スマホを持たない小学生の通学や習い事
- 免許を返納した高齢者の通院や買い物
- 知的障害のある人の自力通学の練習
- 日本語が苦手な外国人住民（英語のカードも作れます）

乗換案内アプリは、スマホを持っていて毎回検索できる人が前提です。紙の時刻表は全路線が載っていて、自分に必要な数本を探すのが大変です。このアプリは、その人が毎日使う一往復だけを、大きな文字と目印の絵でカードにします。

## つかいかた

1. 都道府県とバス会社を選ぶ（時刻表はその場でダウンロードします）
2. いつも乗るバス停を選ぶ（ひらがなでも、「近くのバス停」からでも選べます）
3. 降りるバス停を選ぶ（のりかえなしで行ける所だけが、バスの多い順に並びます）
4. 名前・行き先のマーク・カードに載せる時間帯を選ぶ
5. 印刷する、または待ち受け画像を保存する

## できること

- **バスの前の表示を再現**：系統番号と行き先を、バスの方向幕（LED）の見た目でカードに載せます。系統が多くても、データから判断して「どのバスでも だいじょうぶ」「『仙台駅』ゆきなら どれでも OK」のように一言で言い切ります。
- **降車ボタンのタイミング**：「○○を でたら ボタン」と、降りる一つ前の停留所を示します。
- **のりばまで迷わない**：のりば番号・方向と、地理院タイルの地図を載せます。大きなバス停では、いちばんバスが多いのりばに自動でしぼり込みます。
- **曜日ごとのダイヤを自動判定**：平日・土曜・日祝のほか、コミュニティバスに多い「月・水・金曜」などの運行日も、GTFSのカレンダーからまとめます。
- **やさしい日本語・ふりがな・英語**：GTFS-JPの翻訳データから漢字にふりがなを付けます。フォントは BIZ UDゴシック です。
- **3つの出力**：定期入れサイズ（85×54mm）のカード、家族や支援者向けのA4シート、スマホの待ち受け画像（1170×2532px）。
- **ダイヤ改正に強い**：A4シートのQRコードを開くと、最新のデータで同じ設定のカードを作り直せます。

## データとAPI

- [GTFSデータリポジトリ](https://gtfs-data.jp/) API v2
  - `/v2/feeds`（フィード一覧・都道府県・ライセンス・有効期限）
  - `/v2/organizations/{organization_id}/feeds/{feed_id}/files/feed.zip?rid=current`（最新データ）
- 予備の取得先：Mobility Database（latest.zip）。リポジトリにないフィードもここから読み込みます。
- 手元の GTFS-JP の ZIP ファイルも読み込めます。
- 地図：地理院タイル（国土地理院）
- 祝日：holiday_jp

時刻データのライセンスは、アプリの画面と印刷物に事業者ごとに表示します。

## 個人情報について

計算はすべてブラウザの中（Web Worker）で行います。名前・電話番号・位置情報はどこにも送信しません。作り直し用のリンクにも、名前と電話番号は入りません。

## 手元で動かす

サーバー不要の静的サイトです。このフォルダで

    python3 -m http.server 8000

を実行して、http://localhost:8000/ を開いてください。HTMLファイルをダブルクリックして開く方法では動きません。

## ライセンス・クレジット

- フォント：BIZ UDPゴシック／BIZ UDゴシック（SIL Open Font License 1.1）
- ライブラリ：fflate、qrcode-generator、holiday_jp（MIT License）
- 詳しくは [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

## 生成AIの利用について

企画・設計・プログラム・説明文の作成に、生成AI（Anthropic社のClaude）を使いました。アプリの実行時にはAIを使わず、時刻やカードの内容はすべてGTFSデータからプログラムで計算しています。

---

**English:** My Bus Card turns the GTFS-JP open data of Japanese bus operators into a personal, pocket-size timetable card (85×54 mm), an A4 guide sheet and a phone wallpaper that show only the one round trip a person takes every day. It is made for children without phones, older people who gave up driving, and anyone who finds buses hard to use. Everything runs in the browser, and no personal data is sent anywhere.
