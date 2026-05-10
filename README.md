# アレルギー記録 PWA サンプル

スマホブラウザで使える、食物アレルギーの摂取記録・症状写真・保護者向け掲示板のPWAサンプルです。

## 使い方

1. `index.html` をブラウザで開く
2. 「Googleでログイン（デモ）」を押す
3. 記録・掲示板を試す

## GitHub Pagesで公開する場合

このフォルダ内のファイルをリポジトリ直下に置き、Settings > Pages で公開してください。

## 本番化で差し替える部分

- デモ認証 → Firebase Authentication Googleログイン
- localStorage → Firestore
- 写真のbase64保存 → Firebase Storage
- 通報ボタン → 管理者レビュー画面
- 掲示板投稿 → Firestore Security Rulesで本人・管理者権限を制御

## 主な画面

- ログイン
- ホーム
- 摂取・症状記録
- 症状写真アップロード
- 記録一覧
- カレンダー
- ハッシュタグ検索型掲示板
- 投稿詳細・コメント
- プロフィール
