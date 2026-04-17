/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const CORSHEADERS = {
	'Access-Control-Allow-Origin': process.env.CORS_DOMAIN || '127.0.0.1:8787',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	Vary: 'Origin',
};

function returnError(e: unknown) {
	var eMessage: string = '';

	if (e instanceof Error) {
		eMessage = e.message;
	} else {
		eMessage = 'エラーが発生しました';
	}

	return new Response(`{"statusCode": 400, "error": "${eMessage}"}`, {
		status: 400,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}

function generateShortUrlKouho(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return result;
}

async function generateShortUrl(KV: KVNamespace): Promise<string> {
	var result: string = '';
	var retryLimit = 3;

	// 衝突しない短縮文字列を探索
	while (1 && retryLimit > 0) {
		retryLimit -= 1;
		const shortUrl = generateShortUrlKouho();
		if (!(await KV.get(shortUrl))) {
			result = shortUrl;
			break;
		}
	}

	// 衝突回数が上限に達した場合、エラーを投げる
	if (retryLimit === 0) {
		throw new Error('短縮URLの生成に失敗しました。\\n衝突エラー');
	}

	return result;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const origin = new URL(request.headers.get('Origin') || 'http://127.0.0.1:8787');
		const method: string = request.method;
		const url: URL = new URL(request.url);
		const body: string = await request.text();

		// CORS対応
		if (method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: CORSHEADERS,
			});
		}

		// リクエストのオリジンを検証
		if ( method === 'POST' && origin && origin.host !== CORSHEADERS['Access-Control-Allow-Origin']) {
			return new Response('{"statusCode": 403, "error": "オリジン検証エラー"}', {
				status: 403,
				headers: {
					'Content-Type': 'text/plain',
				},
			});
		}

		/*
		  短縮URL生成
		    メソッド: POST
		   	パス: /api/shorten
			  Content-Type: application/json
			  ボディ: url=https://example.com
		*/
		if (method === 'POST' && url.pathname === '/api/shorten' && request.headers.get('Content-Type') === 'application/json') {
			try {
				const { url: longUrl } = JSON.parse(body);

				// 短縮前のURLを検証(RFC3986チェック)
				const urlCond = new RegExp(
					'^' +
						'(?:https?):' + // scheme
						'(?:\\/\\/(?:' +
						"(?:[A-Za-z0-9\\-._~%!$&'()*+,;=:]+@)?" + // userinfo
						'(?:' +
						'\\[[A-Fa-f0-9:.]+\\]' + // IPv6
						'|' +
						'(?:[A-Za-z0-9\\-._~%]+)' + // host (reg-name / IPv4簡略)
						')' +
						'(?::\\d+)?' + // port
						')?)?' +
						"(?:\\/[A-Za-z0-9\\-._~%!$&'()*+,;=:@/]*)*" + // path
						"(?:\\?[A-Za-z0-9\\-._~%!$&'()*+,;=:@/?]*)?" + // query
						"(?:\\#[A-Za-z0-9\\-._~%!$&'()*+,;=:@/?]*)?" + // fragment
						'$',
				);
				if (!urlCond.test(longUrl)) {
					throw new Error('無効なURLです。');
				}

				// 短縮URLを生成
				const shortUrl = await generateShortUrl(env.KV);
				await env.KV.put(shortUrl, longUrl);

				// 短縮URLを返す
				return new Response(`{"statusCode": 200, "shortUrl": "${url.origin}/${shortUrl}"}`, {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				});
			} catch (e) {
				return returnError(e);
			}
		}

		/*
		  短縮URLリダイレクト
				メソッド: GET
				パス: /<任意> (ルートを除く)
		 */
		let redirectPathCond = /^\/[^\/]+\/?$/; //1階層のパラメタかつルートを除く正規表現
		if (method === 'GET' && redirectPathCond.test(url.pathname)) {
			try {
				const shortUrl = url.pathname.slice(1);
				const longUrl = await env.KV.get(shortUrl);

				if (longUrl) {
					return new Response(null, {
						status: 302,
						headers: {
							Location: longUrl,
						},
					});
				} else {
					return new Response(null, {
						status: 404,
						headers: {
							'Content-Type': 'text/plain',
						},
					});
				}
			} catch (e) {
				return returnError(e);
			}
		}

		// どのAPIリクエストにも合致しなかった場合
		return new Response('{"statusCode": 400, "error": "Bad Request"}', {
			status: 400,
			headers: {
				'Content-Type': 'application/json',
			},
		});
	},
} satisfies ExportedHandler<Env>;
