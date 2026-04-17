function generateShortUrl() {
 	// エラークリア
    document.getElementById("input_error_label").style.display = "none";
 	document.getElementById("input_required_label").style.display = "none";
 	document.getElementById("with-label-input").ariaInvalid = "false";

    const text = document.querySelector("#with-label-input").value;
    const size = 256;
    //const foreground = document.getElementById("foreground").value;
    //const background = document.getElementById("background").value;
    const foreground = "#000000";
    const background = "#ffffff";

    // 空文字チェック
    if (text.trim() === "") {
        document.getElementById("input_required_label").style.display = "block";
        document.getElementById("with-label-input").ariaInvalid = "true";
        return;
    }

    // URLを短縮
    fetch('/api/shorten', {
        method: 'POST',
        body: JSON.stringify({ url: text }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
     	if (response.status !== 200) {
            return response.json().then(error => {
          		document.getElementById("input_error_label").textContent = `${error.error}`;
          		document.getElementById("input_error_label").style.display = "block";
                throw new Error(`${response.status} ${response.statusText} ${error.error}`);
            });
        }
        return response.json();
    })
    .then(data => {
        var shortUrl = data.shortUrl;
        // 新しいカードを準備
        const output_list = document.getElementById("output-list");
        const mock_card = document.getElementById("mock-card");

        const new_card = mock_card.cloneNode(true);
        new_card.style.display = "block";
        new_card.classList.add("fade-in-up");

        // カードにQRコードとテキストを設定
        const inputTextField = new_card.querySelector("input[name='input_text']");
        const outputTextField = new_card.querySelector("input[name='output_text']");
        const copyButton = new_card.querySelector(".copybutton");
        inputTextField.value = text;
        outputTextField.value = shortUrl;
        copyButton.addEventListener("click", () => {
            outputTextField.select();
            document.execCommand("copy");
        });

        const qrCodeContainer = new_card.querySelector(".qrcode");
        qrCodeContainer.innerHTML = "";
        if (text.trim() !== "") {
            new QRCode(qrCodeContainer, {
                text: shortUrl,
                width: size,
                height: size,
                colorDark: foreground,
                colorLight: background
            });
        }

        // カードをリストの先頭に追加
        output_list.insertBefore(new_card, output_list.firstChild);
    })
    .catch(error => {
        console.error(error);
    });
}

// 初回アクセス時、#https://exmaple.com の形でURLハッシュの指定があったときにフォームを自動入力する
const initialParam = window.location.hash.slice(1);
if (initialParam) {
    document.querySelector("#with-label-input").value = initialParam;
    generateShortUrl();
}

// 生成ボタンをクリックしたときにフォームを自動入力する
document.querySelector("#gen").addEventListener("click", () => {
    generateShortUrl();
});
