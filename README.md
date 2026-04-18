# URL Shortener on Cloudflare Workers

Cloudflare Workers + Workers KV を使った、シンプルな URL 短縮サービスです。

---

## 概要

この Worker は次の 2 つの機能を提供します。

- `POST /api/shorten` で短縮 URL を発行
- `GET /<短縮キー>` で元 URL へリダイレクト

実装上、短縮データは KV に保存されます。また CORS 許可ドメインは `CORS_DOMAIN` 環境変数で制御します。

---

## 前提条件

- Node.js 18 以上（推奨）
- Cloudflare アカウント
- Wrangler CLI（`npm install` 後に `npx wrangler ...` で利用可）

---

## セットアップ

```bash
npm install
```

ローカル開発:

```bash
npm run dev
```

---

## Cloudflare へのデプロイ方法

---

### 1) このリポジトリをフォーク
まずは、このリポジトリをフォークしてください。

---

### 2) フォークしたリポジトリを元にWorkerを作成
続いて、Cloudflareの`Workers & Pages`設定画面から、
`アプリケーションを作成する` > `Continue with GitHub`の順にクリックしてください。

その後、Githubとアカウント連携し、リポジトリとCloudflare Workersの紐付けを行います。

これでリポジトリにプッシュした内容が自動的にCloudflare Workersに展開される継続展開(CD)の設定が完了しました。

参考: [GitHub へのコミットをトリガーに Cloudflare Workers をデプロイする \(Accessed:Sat Apr 18 2026\)](https://zenn.dev/ss49919201/articles/04fd9f51170f92)


---

### 3) 実行時に使う Worker 環境変数 `CORS_DOMAIN` を設定

Workerの継続展開を設定しただけでは、`オリジン検証エラー`が発生して利用することができません。
そのため、アプリケーションが動作している**正規のドメイン**を環境変数に設定する必要があります。

まずは、`Workers`の設定ページを開いてください。

続いて、`ドメインとルート`欄にあるドメイン一覧のうち、主として使いたいドメイン**一個**を選びます。

続いて、`変数とシークレット`欄右上の`+追加`をクリックして、以下のように設定します。

| タイプ | 変数名 | 値 |
|--------|--------|----|
| テキスト | `CORS_DOMAIN` | `<先ほど選んだドメイン>` |

最後に、`デプロイ`ボタンをクリックしてください。

参考: [Environment variables · Cloudflare Workers docs \(Accessed:Sat Apr 18 2026\)](https://developers.cloudflare.com/workers/configuration/environment-variables/#add-environment-variables-via-the-dashboard)


---

## デプロイしたプログラムの使い方

この手順では `WORKER_URL` を実際のデプロイ URL に置き換えてください。

---

### 1) URL を短縮する

ブラウザから`WORKER_URL`にアクセスします。

URL入力欄に短縮したいURLを入力して「URL短縮」ボタンを押してください。

短縮後のURLとQRコードが生成されます。

---

もしくは、`https://<worker-name>.<subdomain>.workers.dev/#https%3A%2F%2Fexample.com`のように、
ハッシュにURLを含めた`WORKER_URL`にアクセスします。

即時短縮URLとQRコードが生成されます。


---

### 2) 短縮 URL にアクセスしてリダイレクト

発行された `shortUrl` にアクセスすると元 URL にリダイレクトされます。
