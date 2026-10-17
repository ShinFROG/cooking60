# Webフォントの配布元とライセンス

Cooking60は、InterとNoto Sans JPをサイト内の `assets/fonts/` から配信します。表示のためにGoogle Fonts APIや外部CDNへ接続しません。以下はGoogle Fontsの公式リポジトリから取得し、公開ページ向けに文字を絞った改変版です。

確認・取得日：2026-10-17。

## 配布元

取得元のGoogle Fontsコミットは、両フォントとも `47d54ca1ebb14fd864695f1d39dc734f39017c33` です。変動する `main` ブランチではなく、このコミットのファイルを使用しています。

| フォント | 公式配布ページ | 取得したファイル | 取得したライセンス |
| --- | --- | --- | --- |
| Inter | [Google Fonts / Inter](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/inter) | [Inter[opsz,wght].ttf](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/inter/Inter%5Bopsz,wght%5D.ttf) | [OFL.txt](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/inter/OFL.txt) |
| Noto Sans JP | [Google Fonts / Noto Sans JP](https://github.com/google/fonts/tree/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/notosansjp) | [NotoSansJP[wght].ttf](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf) | [OFL.txt](https://raw.githubusercontent.com/google/fonts/47d54ca1ebb14fd864695f1d39dc734f39017c33/ofl/notosansjp/OFL.txt) |

## 配布条件

両フォントともSIL Open Font License 1.1（OFL）で配布します。サイトのプログラム用MITライセンスや独自コンテンツ用CC BY 4.0は、フォントファイルには適用しません。OFLは条件に従う埋め込み・改変・再配布を許諾しており、同一サイトでのWebフォント配信にも使用できます。フォント単体の販売は許諾されていません。

原文を変更せず、著作権表示とともに同梱しています。

- [Interの著作権表示とOFL原文](../public/assets/fonts/OFL-Inter.txt)：Copyright 2020 The Inter Project Authors。フォント内部にある2016年の原著作権表示も保持しています。
- [Noto Sans JPの著作権表示とOFL原文](../public/assets/fonts/OFL-NotoSansJP.txt)：Copyright 2014–2021 Adobe。予約フォント名は `Source` で、この配布版のフォント名には使用していません。
- [OFL公式FAQ：Webフォントとサブセット](https://openfontlicense.org/ofl-faq/)

これは上流配布物の全文字版ではありません。字体・ライセンス・元の著作権者の表示を保持し、文字の削減とWOFF2圧縮を行っています。各フォントの作者がCooking60やこの改変版を推奨・保証するという意味ではありません。

## 変換と対象文字

FontTools 4.60.2とBrotli 1.2.0で、TrueType可変フォントをWOFF2に変換しました。太さの可変軸は100〜900を保持しています。Interは光学サイズ軸（14〜32）も保持しています。OpenTypeの字形処理・元のヒンティング・著作権とライセンスを含む名前テーブルを保存しています。

- Inter：ASCII、Latin-1、一般的な句読点・通貨記号など、元フォントが持つ対象文字を収録。
- Noto Sans JP：公開する `src/*.mjs`、`src/*.css`、`src/*.html`、`data/public/*.json`、`scripts/build.mjs` の文字と、ASCII、日本語句読点・ひらがな・カタカナ・半角カナ等を収録。ローカルの調理記録、バックアップ、QA出力、非公開情報は対象にしていません。
- 未収録の文字はCSSの後続に指定するシステムフォントへフォールバックします。公開文言に漢字を追加した場合は対象文字を再収集するか、必要な文字を追加して再生成してください。

生成物のバイト数、SHA-256、可変軸、入力元のSHA-256、対象にした公開ファイルは [manifest.json](../public/assets/fonts/manifest.json) に記録しています。各WOFF2に対応する `.unicodes.txt` は、実際に収録したUnicodeコードポイントの一覧です。

<!-- font-sizes:start -->
| 配布ファイル | 実サイズ | 収録文字数 |
| --- | ---: | ---: |
| `inter-latin.woff2` | 107,044 bytes（104.5 KiB） | 300 |
| `noto-sans-jp.woff2` | 409,604 bytes（400.0 KiB） | 1,313 |

2ファイルの合計は 516,648 bytes（504.5 KiB）です。
<!-- font-sizes:end -->

## 再生成

依存ツールは公開サイトの実行時には不要です。公式の取得URLから元TTFを作業用ディレクトリへ保存し、FontTools 4.60.2とBrotli 1.2.0を用意して、リポジトリのルートから次を実行すると、同じ対象文字と変換設定で生成できます。ファイル名の文字一覧は配布するWOFF2と対にしてください。

```sh
python -m fontTools.subset /path/to/Inter.ttf \
  --unicodes-file=public/assets/fonts/inter-latin.woff2.unicodes.txt \
  --flavor=woff2 --output-file=public/assets/fonts/inter-latin.woff2 \
  --name-IDs='*' --name-languages='*' --name-legacy \
  --layout-features='*' --notdef-glyph --notdef-outline --recommended-glyphs

python -m fontTools.subset /path/to/NotoSansJP.ttf \
  --unicodes-file=public/assets/fonts/noto-sans-jp.woff2.unicodes.txt \
  --flavor=woff2 --output-file=public/assets/fonts/noto-sans-jp.woff2 \
  --name-IDs='*' --name-languages='*' --name-legacy \
  --layout-features='*' --notdef-glyph --notdef-outline --recommended-glyphs
```

文字収録範囲を更新したときは、WOFF2・文字一覧・manifest・この文書の実サイズを一緒に更新します。文字一覧だけを後から広げても、既存のWOFF2の字形は増えません。
