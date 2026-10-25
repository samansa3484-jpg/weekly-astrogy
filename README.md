# WEEKLY ASTROLOGY

星の動きとNLPの問いを組み合わせた週間アストロロジー手帳アプリです。

## 目標
- Webアプリで予定や振り返りを入力・保存する
- A4横向きで美しく印刷・PDF保存する
- 毎週の天体イベントに合わせてテーマを更新する

## デザイン
2026年11月9日〜15日の手帳画像を基準とします。

淡いアイボリー、ブルー、落ち着いた紺とゴールドを基調に、月・星・羽・葉の繊細な装飾を使用します。

月曜〜日曜の7列、5:00〜23:00の時間軸、ONE ACTION、THIS WEEK IS GOOD FOR、THIS WEEK'S DIRECTION、正円のホロスコープ、毎日の問い、GOOD・NEW・感謝したいこと・小さな一歩を配置します。

## 開発計画
1. ReactとTypeScriptで画面を再現する
2. 予定の入力・保存とA4横向き印刷を実装する
3. 週の切り替え機能を追加する
4. 天体計算と正確なホロスコープを実装する
5. 週間テーマと問いの更新機能を追加する

## GitHub Pages 公開

公開予定URL: https://samansa3484-jpg.github.io/weekly-astrogy/

1. Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定します。
2. `main` ブランチにデプロイ用ワークフローを取り込むと、Actions から自動公開されます。
3. 公開後、上記URLで画面表示、入力保存、A4横向き印刷を確認してください。

注意: 保存内容は使用ブラウザの localStorage に保持され、端末間では同期されません。天体情報とホロスコープは未検証の仮表示です。
