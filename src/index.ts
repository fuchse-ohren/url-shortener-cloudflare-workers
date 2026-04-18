const CORSHEADERS = {
	'Access-Control-Allow-Origin': process.env.CORS_DOMAIN || '127.0.0.1:8787',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	Vary: 'Origin',
};

function secureResponse(status: number, headers: Record<string, string>, body: string): Response {
	headers['Strict-Transport-Security'] = 'max-age=31536000;';
	headers['X-Content-Type-Options'] = 'nosniff';
	headers['X-Frame-Options'] = 'DENY';
	headers['Referrer-Policy'] = 'no-referrer';
	headers['Cache-Control'] = 'no-cache, no-store';
	headers['X-XSS-Protection'] = '1; mode=block';
	headers['fox'] = 'cute';
	return new Response(body, {
		status,
		headers,
	});
}

function returnError(e: unknown) {
	var eMessage: string = '';

	if (e instanceof Error) {
		eMessage = e.message;
	} else {
		eMessage = 'エラーが発生しました';
	}

	return secureResponse(400, { 'Content-Type': 'application/json' }, `{"statusCode": 400, "error": "${eMessage}"}`);
}

function generateShortUrlKouho(length: number): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.!*)(';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return result;
}

async function generateShortUrl(KV: KVNamespace): Promise<string> {
	var result: string = '';
	var retryCount = 0;
	const retryLimit = 6;
	const minimumLength = 1;

	// 衝突しない短縮文字列を探索
	while (1 && retryCount < retryLimit) {
		const shortUrl = generateShortUrlKouho(retryCount + minimumLength);
		if (!(await KV.get(shortUrl))) {
			result = shortUrl;
			break;
		}
		retryCount += 1;
	}

	// 衝突回数が上限に達した場合、エラーを投げる
	if (retryLimit === retryCount) {
		throw new Error('短縮URLの生成に失敗しました。\\n衝突エラー');
	}

	return result;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const origin = request.headers
			.get('Origin')
			?.replace(/^https?:\/\//, '')
			.split('/')[0];
		const method: string = request.method;
		const url: URL = new URL(request.url);
		const body: string = await request.text();

		// CORS対応
		if (method === 'OPTIONS') {
			return secureResponse(204, CORSHEADERS, '');
		}

		// リクエストのオリジンを検証
		if (method === 'POST' && (origin !== CORSHEADERS['Access-Control-Allow-Origin'] || origin === undefined)) {
			return secureResponse(403, { 'Content-Type': 'application/json' }, '{"statusCode": 403, "error": "オリジン検証エラー"}');
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
				return secureResponse(200, { 'Content-Type': 'application/json' }, `{"statusCode": 200, "shortUrl": "${url.origin}/${shortUrl}"}`);
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
					return secureResponse(302, { Location: longUrl }, '');
				} else {
					return secureResponse(
						404,
						{
							'Content-Type': 'text/plain',
						},
						'',
					);
				}
			} catch (e) {
				return returnError(e);
			}
		}

		// どのAPIリクエストにも合致しなかった場合
		return secureResponse(
			400,
			{
				'Content-Type': 'application/json',
			},
			'{"statusCode": 400, "error": "Bad Request"}',
		);
	},
} satisfies ExportedHandler<Env>;
