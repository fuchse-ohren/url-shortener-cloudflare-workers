# URL Shortener on Cloudflare Workers

Cloudflare Workers + Workers KV を使った、シンプルな URL 短縮サービスです。

## 概要

この Worker は次の 2 つの機能を提供します。

- `POST /api/shorten` で短縮 URL を発行
- `GET /<短縮キー>` で元 URL へリダイレクト

実装上、短縮データは KV に保存されます。また CORS 許可ドメインは `CORS_DOMAIN` 環境変数で制御します。

## 前提条件

- Node.js 18 以上（推奨）
- Cloudflare アカウント
- Wrangler CLI（`npm install` 後に `npx wrangler ...` で利用可）

## セットアップ

```bash
npm install
```

ローカル開発:

```bash
npm run dev
```

## Cloudflare へのデプロイ方法

> **必須**: デプロイ前に、KV 名前空間バインドと `CORS_DOMAIN` を設定してください。

### 1) KV 名前空間を作成

```bash
npx wrangler kv namespace create KV
```

コマンド結果に表示される `id` を控えてください。

### 2) `wrangler.jsonc` に KV バインドを設定

`wrangler.jsonc` の `kv_namespaces` を有効化し、作成した ID を設定します。

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "<作成したKV名前空間ID>"
    }
  ]
}
```

> このプロジェクトのコードは `env.KV` を参照するため、`binding` 名は **KV** にしてください。

### 3) 実行時に使う Worker 環境変数 `CORS_DOMAIN` を設定

このアプリは `CORS_DOMAIN` を CORS 許可判定に使います。

`wrangler.jsonc` に `vars` を追加する例:

```jsonc
{
  "vars": {
    "CORS_DOMAIN": "example.com"
  }
}
```

> 例: フロントエンドが `https://app.example.com` の場合、`CORS_DOMAIN` は `example.com` のように末尾一致で判定しやすい値に設定してください。

### 4) デプロイ

```bash
npm run deploy
```

または:

```bash
npx wrangler deploy
```

デプロイ完了後、`https://<worker-name>.<subdomain>.workers.dev` の URL が払い出されます。

## デプロイしたプログラムの使い方

以下では `WORKER_URL` を実際のデプロイ URL に置き換えてください。

### 1) URL を短縮する

エンドポイント:

- `POST /api/shorten`
- `Content-Type: application/json`
- Body: `{"url":"https://example.com"}`

例:

```bash
curl -X POST "${WORKER_URL}/api/shorten" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

成功時レスポンス例:

```json
{"statusCode": 200, "shortUrl": "https://<worker-domain>/Ab12Cd"}
```

### 2) 短縮 URL にアクセスしてリダイレクト

発行された `shortUrl` にブラウザまたは `curl -I` でアクセスします。

```bash
curl -I "${WORKER_URL}/Ab12Cd"
```

`302` と `Location` ヘッダーで元 URL にリダイレクトされます。

## 補足

- CORS プリフライト (`OPTIONS`) に対応しています。
- 存在しない短縮キーは `404` を返します。
- 不正な入力や未定義パスは `400` を返します。

