# 30日60品 — Cooking60

**公開サイト：[Cooking60](https://shinfrog.github.io/cooking60/)**

[GitHubリポジトリ](https://github.com/ShinFROG/cooking60) · [公開ワークフロー](https://github.com/ShinFROG/cooking60/actions/workflows/pages.yml)

2026年10月17日にGitHub Pagesへ公開しました。全60品の未試作表示を維持した公開準備版です。

30日間の昼・夕食に異なる60料理を組み、作れる料理を増やすための日本語サイトです。丼、麺、カレー、主菜とご飯を含み、朝食は固定メニューを選べます。

**現在は、60品すべてが未試作の公開準備版です。** 公開情報と材料・手順を照合して見直しましたが、分量と時間は教材草稿の目安で、実測結果ではありません。照合先と修正内容は各料理の確認範囲と [照合記録](docs/CONTENT_REVIEW.md) にまとめています。サイトの機能確認と実際の調理確認は分けて記録しています。

## できること

- 30日分の献立、今日・週の表示、昼夕の2枠交換、保留・外食の指定。
- 60料理の検索と絞込み、材料の1〜4人分換算、工程のチェックと印刷。
- 期間別の買物集計、固定朝食の追加、購入済み・家にある物の確認。
- 作った日、再練習、習得の自己確認、短いメモの保存。
- 個人記録のJSON書出し・読込みと、このサイトの記録だけの削除。

公開教材は静的HTML・CSS・JavaScript・JSON・独自SVGで構成します。実体のある料理別HTMLを生成するため、個別URLを直接開けます。表示や記録に外部API、外部フォントサービス、アクセス解析タグは使いません。InterとNoto Sans JPを同じサイトから配信します。フォントの配布元・ライセンス・軽量化の記録は [FONT-LICENSES](docs/FONT-LICENSES.md) を参照してください。

## ローカルで確認する

Node.js 22以上とnpmを使います。通常のビルド・データ検査・単体テストに外部npmパッケージは不要で、`npm install` は必要ありません。

```sh
npm run check
npm run preview
```

プレビューは [http://127.0.0.1:4173/](http://127.0.0.1:4173/) で開きます。停止はターミナルで `Ctrl+C`。HTMLを直接ダブルクリックせず、プレビューサーバーから開いてください。

| コマンド | 用途 |
| --- | --- |
| `npm run validate` | 60料理、30日献立、権利情報、材料、未試作表示などを検査 |
| `npm test` | 献立・買物・記録・保存と実データのテスト |
| `npm run build` | 公開ファイルを `dist/` に生成 |
| `npm run check` | データ検査 → テスト → ビルド → 内部リンク・公開物検査 |
| `npm run audit:build` | 生成済みHTMLの内部リンクと公開物を検査 |
| `npm run preview` | 生成済み `dist/` のローカル表示 |
| `npm run check:release` | 実調理を伴う正式版の条件を検査。現段階では失敗するのが正しい |

GitHub PagesのプロジェクトURLと同じサブパスで確認する場合は、以下を実行し、[http://127.0.0.1:4173/cooking60/](http://127.0.0.1:4173/cooking60/) を開きます。

```sh
PREVIEW_BASE=/cooking60/ npm run preview
```

ブラウザ検査は別途PlaywrightとChromeを使います。通常の公開ビルドには必要ありません。`PLAYWRIGHT_MODULE` にPlaywrightのモジュールパス、`BROWSER_CHANNEL=chrome`、`TEST_URL` に起動済みプレビューURLを指定して `npm run test:browser` を実行します。結果画像と印刷確認PDFは `.qa/` に保存され、公開対象から除外されます。

## 公開済みサイトを更新する

このリポジトリで教材や画面を編集し、`npm run check` を実行してから、変更した公開対象ファイルをコミットして `main` へpushします。GitHub Actionsの検査成功後、上記の公開URLへ自動反映されます。個人記録や確認用の `.qa/` はコミットしません。

```sh
npm run check
git status --short
# 変更した公開対象だけを git add してコミット
git push origin main
```

## 別のリポジトリへGitHub Pagesで公開する場合

この手順を進めると、未試作であることを明示した公開準備版がインターネット上で読める状態になります。以後、`main` へのpushは検査成功後に自動で公開内容へ反映されます。

1. GitHubで公開用リポジトリを新規作成します。ここで用意したソースをリポジトリ直下に置き、既定ブランチを `main` にします。既存の個人作業フォルダ全体は取り込まず、下記の公開対象だけを選びます。
2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。[GitHub公式の公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
3. ソースを `main` へpushします。先にpushしてPages設定前の実行が失敗した場合は、設定後に **Actions → Check and deploy Cooking60 → Run workflow → main** を選んで実行します。
4. Actionsで `build` と `deploy` の成功を確認し、`github-pages` の環境URLまたはSettingsのPages URLを開きます。
5. ホーム、料理の個別URL、再読込、献立交換、買物、記録の保存・書出しを公開URL上で確認します。URLは所有者とリポジトリが決まってから確定します。

Gitを使う場合の例です。公開用に新しく用意したこのフォルダで実行し、`OWNER` と `REPOSITORY` を自分の公開先に置き換えます。コミット作者名・メールアドレスもGitHubで公開される設定なので、必要に応じてGitHubのプライバシー設定にある非公開メール用アドレスを使います。

```sh
git init -b main
git add .github .gitignore data docs public scripts src tests package.json README.md LICENSE CONTENT-LICENSE.md
git diff --cached --stat
git diff --cached
git commit -m "Create Cooking60 public preview"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

既にGit管理している場合は初期化とremote追加を繰り返さず、既存の公開先を確認して使います。`dist/` はGitに追加しません。ワークフローが `npm run check` で生成し、その中身だけをPages成果物として送ります。プルリクエストでは検査とビルドを行い、デプロイしません。`workflow_dispatch` も `main` を選んだ場合だけデプロイします。

ワークフローは `checkout@v6`、`setup-node@v6`、`configure-pages@v5`、`upload-pages-artifact@v4`、`deploy-pages@v4` を使用します。Pagesの権限はデプロイジョブに限定しています。[GitHub公式のカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)／[setup-node v6の公式説明](https://github.com/actions/setup-node/tree/v6)

## 公開するものと個人記録

公開対象は、独自に作成した教材、サイトコード、一般的な献立案、安全情報への参照リンク、文書、テスト、ビルド設定です。料理の画像は本サイト向けにAI生成した完成イメージで、[生成方法とプロンプト](docs/GENERATED_IMAGES.md)を記録しています。第三者サイトの料理文章・写真・ロゴを転載していません。

開始日、調理日、メモ、買物チェックなどの利用者の記録はブラウザの `localStorage` に保存します。サイト側から記録を送信する処理はありません。端末間の自動同期はなく、ブラウザのデータ削除で失われるため、必要な記録はJSONに書き出して保管します。

**書き出した `cooking60-records*.json / cooking60-protected*.json` は公開リポジトリや `public/` に置かないでください。** 私的メモ、個人写真、アカウント情報、環境設定も公開対象に含めません。`.gitignore` は補助であり、公開前には選択したファイルとGit履歴を確認します。Pagesへ送る対象を `dist/` に絞っても、公開リポジトリにコミットしたソース自体は閲覧できます。

同じGitHub Pagesアカウントの別プロジェクトは同一オリジンになり得ます。保存キーの分離は衝突を防ぐ仕組みで、秘密情報の隔離を保証するものではありません。住所や健康情報などの入力を求める設計にはしていません。

## 教材を正式版にする条件

`npm run check:release` は、全60品の `validation.status` が `verified` であり、各品に実調理日 `testedOn` と実測総時間 `measuredTotalMinutes` があることを確認します。さらに48品以上の実測総時間が30分以内である必要があります。フラグの変更だけでは通りません。

現在のGitHub Actionsは、未試作表示を維持した公開準備版を `npm run check` で公開します。**正式版ゲートは現在のデプロイ条件には含めていません。** 全品の試作後に正式版へ移行するときは、ワークフローの検査に `npm run check:release` も追加します。静的検査は味、分量の適切さ、実際の火通りや調理時間を保証しません。

## 構成とライセンス

| 場所 | 内容 |
| --- | --- |
| `data/public/` | 60料理の教材草稿と30日献立 |
| `src/` | 画面、操作、材料集計、端末内記録 |
| `public/assets/` | 独自SVG |
| `scripts/` | 検査、静的生成、プレビュー |
| `tests/` | 単体・公開データテスト、追加のブラウザ検査 |
| `.github/workflows/pages.yml` | GitHub Pagesの検査と公開設定 |
| `docs/SPEC.md` | 仕様原案。作成時点の計画を含む |
| `docs/VERIFICATION.md` | 実行結果と未確認の範囲 |
| `dist/` | ビルドで生成される配信物。Git管理対象外 |

コードは [MIT License](LICENSE)、独自教材・独自SVG・独自文書は [CC BY 4.0](CONTENT-LICENSE.md) です。第三者の参照先の著作物はこれらの許諾に含めません。
