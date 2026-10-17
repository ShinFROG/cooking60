# 料理サイト100件の調査記録

確認日 2026年10月17日。国内25・メーカー25・海外25・献立管理と買物25の計100サイト。公式の公開本文にアクセスし、特徴と今回への設計案を記録した。サイトの順位付けではない。

「本文確認」はトップ、レシピ一覧・詳細、公式機能説明などのテキストを読めたという意味。全レシピ確認、画面目視、ログイン後の機能操作、再利用許諾を意味しない。短い案内だけのサイトも、その範囲を観察欄に記載する。設計案は本件への提案であり、参照サイトの実装を断定するものではない。

## 国内レシピ 25件

| ID | サイトと確認URL | 確認 | 観察 | 仕様への反映案 |
| --- | --- | --- | --- | --- |
| JP01 | [Cookpad](https://cookpad.com/jp) | 本文確認 | 使いたい食材からの検索と、ごはんもの・麺などのカテゴリを併設し、無料で見られる項目とプレミアム項目の表示がある。 | 60品は全件無料閲覧にし、食材名と料理名の両方から探せる検索を付ける。 |
| JP02 | [デリッシュキッチン](https://delishkitchen.tv/) | 本文確認 | 材料から探す入口と料理名から探す入口があり、主材料2つ・時短・基本といった条件を料理紹介に示している。 | 料理カードに主要食材数、所要時間、習得する基本技術を表示する。 |
| JP03 | [クラシル](https://www.kurashiru.com/) | 本文確認 | 食材・料理名・目的やシーンの入口を分け、公式レシピ・記事・レシピカード・短い動画を別導線にしている。 | 60品の一覧と料理の基本を分け、昼向き・夜向き・短時間のフィルタを設ける。 |
| JP04 | [Nadia](https://oceans-nadia.com/) | 本文確認 | 料理の基礎として下ごしらえ・切り方・用語集を用意し、一覧に調理時間が記載されている。 | 手順中の『みじん切り』『弱火』などから独自の短い基本解説へリンクする。 |
| JP05 | [楽天レシピ](https://recipe.rakuten.co.jp/) | 本文確認 | Pickupレシピに調理時間と費用区分があり、丼・炊き込みご飯・パスタ・うどんなど主食の分類が細かい。 | 主食を米・麺・パンや粉ものに整理し、時間と予算の目安は根拠がある場合だけ表示する。 |
| JP06 | [みんなのきょうの料理](https://www.kyounoryouri.jp/) | 本文確認 | ビギナーズを独立した入口にし、動画付き・工程写真付きの初心者向け特集を案内している。 | 初心者向けの順番を設け、難しい工程には自作の補助図や確認ポイントを付ける。 |
| JP07 | [オレンジページnet](https://www.orangepage.net/recipes/weekly-menu) | 本文確認 | 献立カレンダーで日付ごとに主菜・主食・副菜・汁物を区別し、1週間分の買い物リストと印刷を案内している。 | 30日×昼晩の60枠を中心画面にし、週ごとの買い物リストと印刷表示を用意する。 |
| JP08 | [白ごはん.com](https://www.sirogohan.com/) | 本文確認 | 米とだしの基本、下ごしらえ、調理のコツを分類し、調理時間や包丁不要・レンジ活用でも探せる。 | 必要器具と調理方法をデータに持ち、持っている器具で作れる料理に絞れるようにする。 |
| JP09 | [macaroni](https://macaro-ni.jp/) | 本文確認 | レシピ・レシピ動画に加え、下ごしらえや下処理、食材の選び方・保存方法の記事への入口がある。 | 食材を買う前・調理中・余った後に必要な情報を料理詳細から参照できるようにする。 |
| JP10 | [フーディストノート](https://foodistnote.recipe-blog.jp/) | 本文確認 | 料理家名を添えた連載と、包丁不要・5分など条件が分かる記事見出しを掲載している。 | 各料理の参考資料には媒体名・作者名・原典URLを記録し、紹介文は独自に作成する。 |
| JP11 | [FOODIE](https://mi-journey.jp/foodie/list/?recipe=method) | 本文確認 | レシピを食材・料理の種類・調理法で探す入口を持ち、調理法の専用記事一覧がある。 | 焼く・煮る・炒める・蒸すなどの技術で60品を横断し、同じ技術を使う次の料理へ案内する。 |
| JP12 | [dancyu](https://dancyu.jp/) | 本文確認 | プロが教えるレシピと食のストーリーを分け、複数キーワード検索の入力例を示している。 | 検索欄に『鶏肉 パスタ』のような具体例を付け、料理手順と読み物を別の情報として扱う。 |
| JP13 | [ソラレピ](https://recipe.shidax.co.jp/) | 本文確認 | 一覧にカロリー・工程数・所要時間を記載し、主菜や料理ジャンルなどで分類している。 | 習得の負担を判断できるよう工程数と時間を表示する。栄養値は検証された根拠がなければ掲載しない。 |
| JP14 | [つくおき](https://cookien.com/) | 本文確認 | 一覧の各料理に調理時間、冷蔵保存の目安、使用する鍋・フライパンなどの情報が併記されている。 | カードに時間と器具を載せ、保存情報は条件と確認済み出典を伴う専用欄にする。 |
| JP15 | [週末の作り置きレシピ](https://mayukitchen.com/) | 本文確認 | 保存期間・調理時間・調理方法を別の分類として用意し、下味冷凍や包丁いらずからも探せる。 | 当日調理と事前準備を区別し、献立を組み替えても重複料理数が増えないデータ構造にする。 |
| JP16 | [ぽかぽかびより](https://pokapokabiyori.net/) | 本文確認 | 検索欄に食材と器具を組み合わせる入力例があり、火を使わない・電子レンジといった分類がある。 | 『使いたい食材＋使える器具』を同時に指定できる絞り込みを用意する。 |
| JP17 | [しにゃごはん](https://www.shinya-gohan.com/) | 本文確認 | トップ掲載レシピで人数・材料・番号付き工程・ポイントを分け、火加減と加熱時間も工程内に記載している。 | 料理詳細を材料→準備→番号付き手順→失敗しやすい点の共通形式にする。 |
| JP18 | [山本ゆり syunkon](https://ameblo.jp/syunkon/entry-11920776181.html) | 本文確認 | つくねの記事で、少量の卵を使う代わりの材料や、手元にない調味料の代替案を本文に説明している。 | 特別な食材を減らし、置換できる材料・省略可能な材料を明示する。 |
| JP19 | [Mizuki 奇跡のキッチン](https://mizuki-recipe.blog.jp/) | 本文確認 | 簡単・時短・節約を方針として明示し、主菜の食材や副菜などのカテゴリを各記事に付けている。 | 60品の採用基準を『一般的な材料・無理のない時間・基本器具』として公開する。 |
| JP20 | [榎本美沙 ふたりごはん](https://www.futari-gohan.jp/) | 本文確認 | ごはん・麺、発酵食品、季節の手仕事などを区別し、季節別の料理特集を設けている。 | 季節に依存する材料は代替案を用意し、60品を年間を通して作りやすくする。 |
| JP21 | [remy](https://remy.jp/recipe) | 本文確認 | ごはん・パンとパスタ・麺を分け、丼・チャーハン・カレー・リゾットなどの小分類を持つ。 | 60品の構成比をカテゴリ別に確認し、丼やパスタだけに偏らない献立を作る。 |
| JP22 | [トイロノート](https://toiro-note.com/) | 本文確認 | レシピ・日々のつぶやき・調理の知恵袋を分け、主菜とご飯・パン・麺類を別カテゴリにしている。 | 公開用の料理データと個人的な日記や学習記録を分け、後者は端末内だけに保存する。 |
| JP23 | [おいしいLEEレシピ](https://lee.hpplus.jp/leerecipe/) | 本文確認 | 料理家一覧を設け、主役の一皿を作るコツや炊き込みごはんをまとめた特集を掲載している。 | 料理ごとに『今回覚えるコツ』を1つ設定し、60品を学習テーマでも一覧できるようにする。 |
| JP24 | [栗原はるみ ゆとりの空間](https://www.yutori.co.jp/shop/rpc/rpc0/) | 本文確認 | 食材・メニュー・料理カテゴリの入口と今週のレシピを備え、だしのような基本項目も扱っている。 | ご飯を炊く・だしを扱うなどの共通技術を独立した基本ページにして複数レシピから再利用する。 |
| JP25 | [Yuu おうちバル](https://yuu-stylish-bar.blog.jp/) | 本文確認 | 簡単・時短・節約を明示し、レンジ・下味冷凍・お弁当などの条件を記事名に付けている。 | 低負担な料理を前半に配置し、未習得→作った→再現できるの進捗をブラウザ内で管理する。 |

## メーカー公式 25件

| ID | サイトと確認URL | 確認 | 観察 | 仕様への反映案 |
| --- | --- | --- | --- | --- |
| BR01 | [味の素パーク](https://park.ajinomoto.co.jp/recipe/card/703024/) | 本文確認 | 親子丼の詳細に2人分の材料、1/2個と100gの併記、3段階の手順、1人分の栄養値、印刷リンクがある。 | 人数・重量・個数を構造化し、材料と手順への移動、印刷を用意する。 |
| BR02 | [キッコーマン ホームクッキング](https://www.kikkoman.co.jp/homecook/) | 本文確認 | 一覧で調理時間・塩分を表示し、週の献立、切り方・計量の基本、食材の使い切り記事へ案内している。 | 料理カードに時間と基礎技法を表示し、1週間の献立を材料の使い切りと結びつける。 |
| BR03 | [ヤマサ Happy Recipe](https://www.yamasa.com/happy-recipe/search/) | 本文確認 | 料理区分、食材、時間帯、ジャンルに加えて、煮る・焼く・蒸す・炊く等の調理方法で検索できる。 | 技法タグと学習順序を設け、60品の技法の偏りを確認できるようにする。 |
| BR04 | [ミツカン おうちレシピ](https://www.mizkan.co.jp/ouchirecipe/) | 本文確認 | 料理名・食材の検索、旬の食材、夕食特集、サバ缶・ツナ缶を含む素材別入口がある。 | 昼・晩と主材料の組合せで絞り込み、缶詰を使う日も月間計画に含める。 |
| BR05 | [ヒガシマル醤油 ヒガシマルレシピ](https://www.higashimaru.co.jp/recipe/index.html) | 本文確認 | 人気・おすすめの一覧に分数、エネルギー、塩分、使用調味料が並ぶ。 | 一覧だけで所要時間を判断できるようにし、栄養値を載せる場合は算定根拠も持たせる。 |
| BR06 | [桃屋 かんたんレシピ](https://www.momoya.co.jp/recipe/) | 本文確認 | パスタ・炒飯・丼・炊き込みご飯などの分類と、朝食・昼食・夕食のシーン分類を併用する。 | 料理の種類と食事枠を別々の属性にし、朝食は固定枠として扱う。 |
| BR07 | [エバラ食品 おいしいレシピ](https://www.ebarafoods.com/recipe/) | 本文確認 | 料理名・食材名から検索でき、週のおすすめと、たれを使った炒飯や肉野菜炒めの特集がある。 | 市販のたれを使う簡便版と一般調味料で作る基本版の扱いを分け、買い足し負担を示す。 |
| BR08 | [モランボン おすすめレシピ](https://www.moranbong.co.jp/recipe/) | 本文確認 | 鶏むね・鶏もも・豚こま等の肉の部位や形態、調理方法、包丁いらず・ワンパンを選べる。 | 買物リストは豚肉などの大分類だけでなく部位・切り方を保持し、器具条件でも検索する。 |
| BR09 | [ハウス食品 レシピ](https://housefoods.jp/recipe/) | 本文確認 | カレーやごはんものを細分類し、カレー・シチューのリメイクも独立した料理群にしている。 | 同じ料理の具材違いで60品を水増しせず、基本料理と派生版に共通IDを設ける。 |
| BR10 | [エスビー食品 レシピ](https://www.sbfoods.co.jp/recipe/) | 本文確認 | レシピ検索と並んでスパイス・ハーブの分類、使い方のコツ、動画への入口がある。 | レシピから調味料の役割を説明する基本ページへリンクし、任意の香辛料を区別する。 |
| BR11 | [カゴメ レシピ](https://www.kagome.co.jp/products/recipe/) | 本文確認 | 食材からの検索と、時間・塩分・たんぱく質等による並べ替えがある。 | 標準の並び順を学習順にし、時間が短い順にも切り替えられるようにする。 |
| BR12 | [キユーピー とっておきレシピ](https://www.kewpie.co.jp/recipes/) | 本文確認 | レシピに加え、旬・選び方・保存の素材知識と、切り方・下ごしらえの基本を案内する。 | 材料辞典に購入単位、下ごしらえ、保存の出典を持たせて買物から調理へつなぐ。 |
| BR13 | [ケンコーマヨネーズ すべてのレシピ](https://www.kenkomayo.com/pro/c/c20/) | 本文確認 | 家庭向け・外食向けの区分と、1人前の参考原価帯で絞り込める。 | 初心者が家庭で作れる内容を選び、価格は地域・時点に依存する目安として別管理する。 |
| BR14 | [日清製粉ウェルナ レシピ](https://www.nisshin-seifun-welna.com/index/recipe/) | 本文確認 | 主食をパン・ピザ、パスタ、乾麺、粉もの等で分類し、生地から作る料理と時短料理も分ける。 | 主食種類の配分を定義し、生地作りなど長い工程は通常の平日料理と難度を分ける。 |
| BR15 | [ニップン おいしいレシピ](https://www.nippn.co.jp/recipe/) | 本文確認 | 新着・人気レシピに時間とエネルギーを表示し、料理と使用商品それぞれの入口がある。 | 料理名で探す導線を優先し、商品名は任意の補足として保持する。 |
| BR16 | [マルコメ レシピ](https://www.marukome.co.jp/recipe/) | 本文確認 | 下味冷凍、電子レンジ、ワンパン、時短の注目語と、基本レシピの入口がある。 | 作る日と下準備の日を区別できるようにし、冷凍の可否は確認済み根拠を付ける。 |
| BR17 | [ハナマルキ ハナマルレシピ](https://www.hanamaruki.co.jp/recipe/) | 本文確認 | 2人分の材料と段階的手順を示し、電子レンジの出力・加熱分数や調味料を加える理由を記す。 | 各工程に器具・火力や出力・時間・仕上がりの目印を持たせる。 |
| BR18 | [旭松食品 レシピ](https://www.asahimatsu.co.jp/recipe/) | 本文確認 | 高野豆腐を含むカレー・ガパオ・炒め物・鍋を一覧化し、作り置きのリメイクも掲載する。 | 乾物・豆類も主材料に含め、同じ保存食を複数の異なる料理に使える計画を作る。 |
| BR19 | [雪印メグミルク お料理レシピ](https://www.meg-snow.com/recipe/) | 本文確認 | 主食を米・パン・パスタに分け、主菜を肉・魚・卵・豆に分け、5分刻みの時間条件も用意する。 | 主食と主菜を混同しない分類にし、60枠で何を数えるかをサイト冒頭に明示する。 |
| BR20 | [明治 食を知る・楽しむ レシピ](https://www.meiji.co.jp/learned/recipe/) | 本文確認 | 基本ワザ、世界の家庭料理、余り食材の使い切りに進める入口がある。 | 基本技法と世界の料理を段階的に組み込み、食材共有と料理の多様性を両立する。 |
| BR21 | [森永乳業 レシピ](https://www.morinagamilk.co.jp/recipe/) | 本文確認 | 季節のレシピと乳製品の活用動画、牛乳・ヨーグルト・チーズ等の商品分類で案内する。 | 乳製品等を使い切れる料理を週内に配置し、使わない選択肢もデータ上で区別する。 |
| BR22 | [オタフクソース レシピ](https://www.otafuku.co.jp/recipe/) | 本文確認 | 広島・関西お好み焼、焼そば、たこ焼、チヂミの焼き方を動画や写真で案内する。 | 粉ものの代表料理を60品に含め、裏返し・焼き上がり等の失敗しやすい場面を説明する。 |
| BR23 | [ニッスイ レシピ](https://www.nissui.co.jp/recipe/index.html) | 本文確認 | 10分以内、食材3品以下の検索入口と、お魚料理を動画・写真で説明するFish Kitchenがある。 | 時間に加え材料数でも絞り込み、魚料理の基礎に到達できる導線を用意する。 |
| BR24 | [Umios レシピ（旧マルハニチロURLから転送）](https://www.umios.com/jp/recipe/index) | 本文確認 | 商品・ジャンル・季節・調理方法で検索でき、世界各国の魚介料理を別企画として紹介する。 | 魚介料理を日本風だけに偏らせず、リンクの転送先と最終確認日を記録する。 |
| BR25 | [はごろもフーズ レシピ](https://www.hagoromofoods.co.jp/recipe/) | 本文確認 | 炊き込みご飯などの缶詰活用に加え、オーブンがなくてもフライパンで仕上げるグラタンを案内する。 | 必須器具と代替器具を定義し、缶の液汁を使うか捨てるかも材料欄に明示する。 |

## 海外レシピ 25件

| ID | サイトと確認URL | 確認 | 観察 | 仕様への反映案 |
| --- | --- | --- | --- | --- |
| GL01 | [Good Food（旧 BBC Good Food）](https://www.bbcgoodfood.com/) | 本文確認 | 料理一覧に調理時間と Easy などの難易度を併記。取得時は同社 tollbit サブドメインへ転送。 | 60品一覧に所要時間・難易度を常時表示する。 |
| GL02 | [Allrecipes](https://www.allrecipes.com/) | 本文確認 | 料理名・所要時間・評価数に加えて保存導線を掲載。 | 公開評価より先に、自分用の「作りたい・作った」を実装する。 |
| GL03 | [Serious Eats](https://www.seriouseats.com/) | 本文確認 | Food Science と Equipment の案内をレシピと別に設けている。 | 手順に「なぜそうするか」を短く添え、基本技術へリンクする。 |
| GL04 | [Simply Recipes](https://www.simplyrecipes.com/) | 本文確認 | 料理ごとに Why Make This として簡単さ・残り食材利用などを説明。 | 各料理に「この料理で覚えること」「作りやすい理由」を設ける。 |
| GL05 | [The Kitchn](https://www.thekitchn.com/) | 本文確認 | 30分以内・鍋一つの分類と、代用食材・包丁技術・保存の案内がある。 | 時間・調理器具と初心者向け基礎記事を結び付ける。 |
| GL06 | [EatingWell](https://www.eatingwell.com/) | 本文確認 | 週間献立と買い物リストを組にした記事への案内がある。 | 30日計画から週単位の材料確認へ進める構成にする。 |
| GL07 | [Food Network UK](https://foodnetwork.co.uk/recipes) | 本文確認 | 食事区分・主材料・食事条件別に分類。米国URLから英国版へ転送。 | 昼・夜と主材料を独立した項目にする。 |
| GL08 | [Delish](https://www.delish.com/) | 本文確認 | Fast、Budget、One-Pan など生活上の条件から料理へ進める。 | 初心者の選択条件を「短時間・材料少なめ・洗い物少なめ」にする。 |
| GL09 | [Bon Appétit](https://www.bonappetit.com/) | 本文確認 | 月の平日夕食特集と、料理ごとの短い説明を掲載。 | 月間計画と、各料理を選ぶ理由を同時に見せる。 |
| GL10 | [Martha Stewart](https://www.marthastewart.com/) | 本文確認 | 基本調理やソースの失敗修正記事への案内がある。 | 「失敗しやすい点・戻し方」を料理ページの項目にする。 |
| GL11 | [Budget Bytes](https://www.budgetbytes.com/) | 本文確認 | レシピ全体の費用と1人分の費用を併記。 | 費用を載せるなら人数・調査日・対象地域を明記した独自概算にする。 |
| GL12 | [RecipeTin Eats](https://www.recipetineats.com/) | 本文確認 | 材料・料理地域・鍋一つ・米料理・パスタなど複数の分類を用意。 | 主食の種類と調理法を別タグにし、偏りを確認できるようにする。 |
| GL13 | [Just One Cookbook](https://www.justonecookbook.com/) | 本文確認 | Start Here、初心者向け5品、切り方、食材、常備調味料の案内がある。 | 60品一覧とは別に「初めての人向け」の開始導線を設ける。 |
| GL14 | [Just Hungry](https://justhungry.com/) | 本文確認 | 料理名による索引と Japanese Cooking 101 の学習案内がある。 | 料理名索引に加えて、順番に学べる基本講座を置く。 |
| GL15 | [Chopstick Chronicles](https://www.chopstickchronicles.com/) | 本文確認 | 丼・麺・米などの料理種別と、蒸す・揚げるなどの調理法を分離。 | 60品の重複判定は料理IDで行い、分類は複数持たせる。 |
| GL16 | [The Woks of Life](https://thewoksoflife.com/) | 本文確認 | 調理法・道具・中華食材辞典をそれぞれ案内。 | 初見の食材・道具は料理から説明へ進めるようにする。 |
| GL17 | [Maangchi](https://www.maangchi.com/) | 本文確認 | レシピ、食材、調理器具を分け、料理記事と動画への案内を掲載。 | 必要な動作だけ補助説明を置き、本文だけでも作れる形を基本にする。 |
| GL18 | [Korean Bapsang](https://www.koreanbapsang.com/) | 本文確認 | 初めての人向け Start Here と、辛さの穏やかな料理分類がある。 | 初回案内と、辛さ・苦手食材による差し替えを考慮する。 |
| GL19 | [Hebbar’s Kitchen](https://hebbarskitchen.com/) | 本文確認 | 米料理をビリヤニ・プラオに、昼食をロティ・パラタなどに分類。 | 「ご飯・麺・パン」だけでなく、違う調理技術を学べる内訳を設ける。 |
| GL20 | [Cookie and Kate](https://cookieandkate.com/) | 本文確認 | 週の夕食5品を提示し、料理・地域・食材・食事条件・季節から探せる。 | 30日を一度に扱う画面に加え、今週の範囲を切り出す。 |
| GL21 | [Love and Lemons](https://www.loveandlemons.com/) | 本文確認 | 調理時間を併記し、当月の Cooking Club 課題を掲載。 | 月間目標と、今作る1品への導線を用意する。 |
| GL22 | [Smitten Kitchen](https://smittenkitchen.com/) | 本文確認 | 一つの記事に Budget・Chicken・Quick・Weeknight Favorite など複数タグ。 | 「料理の種類」と「日常で作りやすい条件」を分けて管理する。 |
| GL23 | [Minimalist Baker](https://minimalistbaker.com/) | 本文確認 | 30分・鍋一つといった条件を料理名に示し、食事条件の略号に凡例を用意。 | タグの意味を明示し、難解な略語を避ける。 |
| GL24 | [Natasha’s Kitchen](https://natashaskitchen.com/) | 本文確認 | Saved Recipes と Cooking Challenge の入口を設置。 | 料理を集める機能より、課題と達成状況を中心に据える。 |
| GL25 | [Pinch of Yum](https://pinchofyum.com/) | 本文確認 | Meal Prep・Quick and Easy の分類と冷凍準備の記事を掲載。 | まとめて仕込めるものと、食べる直前に仕上げるものを区別する。 |

## 献立管理と買物 25件

| ID | サイトと確認URL | 確認 | 観察 | 仕様への反映案 |
| --- | --- | --- | --- | --- |
| PL01 | [Mealime](https://www.mealime.com/) | 本文確認 | 計画・買物・調理の3段階と、2026年10月21日の終了予告を掲載。 | 導線をつなぎ、外部サービスを必須依存にしない。 |
| PL02 | [Eat This Much](https://www.eatthismuch.com/) | 本文確認 | 食事条件・予算・予定に応じた献立と在庫優先の説明。 | 条件選択を先に置く。栄養の自動最適化は初版から外す。 |
| PL03 | [Plan to Eat](https://www.plantoeat.com/) | 本文確認 | 献立カレンダーから買物リストを作成すると説明。 | 計画と買物リストを同じデータから作る。 |
| PL04 | [Paprika](https://www.paprikaapp.com/) | 本文確認 | 同じ材料の合算、分量調整、工程の選択、月間計画を説明。 | 材料IDと単位を統一する。 |
| PL05 | [Pepperplate](https://www.pepperplate.com/) | 本文確認 | 週の予定、分量調整、複数タイマー、調理モードを紹介。 | 調理中は工程を大きく表示する。 |
| PL06 | [SideChef](https://www.sidechef.com/) | 本文確認 | 料理・食材・調理器具別の入口と、材料追加の導線。 | 器具と時間で絞り込む。 |
| PL07 | [Samsung Food](https://samsungfood.com/) | 本文確認 | 保存、週の献立、買物、共有を紹介。 | 献立編集から買物へつなぐ。 |
| PL08 | [AnyList](https://www.anylist.com/) | 本文確認 | 売場別の自動分類と週・月のカレンダーを説明。 | 買物リストを売場別に分ける。 |
| PL09 | [eMeals](https://emeals.com/) | 本文確認 | 週の料理を選んでから買物へ進む構成。 | 月間全体と今週を切り替える。 |
| PL10 | [Cook Smarts](https://www.cooksmarts.com/) | 本文確認 | 料理学習と献立を結び、実作業時間を説明。 | 総時間と手を動かす時間を分ける。 |
| PL11 | [The Dinner Daily](https://thedinnerdaily.com/) | 本文確認 | 店の特売に応じた週間献立と買物リストを紹介。 | 初版では固定価格を断定しない。 |
| PL12 | [Recipe Keeper](https://recipekeeperonline.com/) | 本文確認 | 週・月の献立、分量変更、買物分類、料理本出力を説明。 | 料理と買物を印刷できるようにする。 |
| PL13 | [CookBook](https://cookbookmanager.com/) | 本文確認 | 料理モードに大きい文字、タイマー、分量変更、調理日記録を説明。 | 調理画面から作った記録へ続ける。 |
| PL14 | [Prepear](https://www.prepear.com/) | 本文確認 | 献立に残り物や外食、予定変更の余地を残すと説明。 | 予定の入替・保留を認める。 |
| PL15 | [Mealie](https://mealie.io/) | 本文確認 | 朝昼夕のカレンダーと世帯別の献立・買物分離を説明。 | 朝食と昼夕の60料理を別に集計する。 |
| PL16 | [Tandoor](https://tandoor.dev/) | 本文確認 | 手動・自動献立、買物の売場順、標準形式への出力を説明。 | 初版は手動入替とデータ出力に絞る。 |
| PL17 | [Grocy](https://grocy.info/) | 本文確認 | 在庫を料理と照合し、不足品を買物へ追加する説明。 | まず「家にある」チェックを採用する。 |
| PL18 | [Intent](https://www.intentapp.com/) | 本文確認 | 目標や好みに合わせた献立を簡潔に案内。公開説明は短い。 | 初回設定を目的と必要条件に絞る。 |
| PL19 | [おいしい健康](https://oishi-kenko.com/) | 本文確認 | 食材検索、献立検索、印刷と栄養情報の出典を掲載。 | 検索と印刷を採用。根拠がない栄養数値は載せない。 |
| PL20 | [me:new](https://menew.jp/) | 本文確認 | 数日分の献立、買物リスト、家にある材料のチェックを説明。 | 買物期間を選び、朝食材料も任意で追加できるようにする。 |
| PL21 | [ヨシケイ](https://yoshikei-dvlp.co.jp/) | 本文確認 | 初めての人向け案内、メニュー紹介、レシピへの入口を分けている。 | 初回の準備から30日計画へ案内する。 |
| PL22 | [ReciMe](https://www.recime.app/) | 本文確認 | 買物リストを売場別またはレシピ別に整理できると説明。 | 合算材料から元の料理をたどれるようにする。 |
| PL23 | [Bring!](https://www.getbring.com/en/home) | 本文確認 | 共有買物リストとレシピ材料の追加を説明。 | 買物チェックを大きくし容易に戻せるようにする。 |
| PL24 | [OurGroceries](https://www.ourgroceries.com/overview) | 本文確認 | 数量やメモ、売場別分類、料理からの材料追加を紹介。 | 数量・単位・補足を別項目にする。 |
| PL25 | [NoWaste](https://www.nowasteapp.com/home/) | 本文確認 | 冷蔵・冷凍・食品庫別の在庫と在庫に応じた料理を案内。 | 保存場所は追加候補。詳細な在庫管理は初版から外す。 |

## 集計対象から外した候補

アクセスに失敗したことは、一般利用者にも閲覧できないという判断ではない。同じサービスの別URLの失敗は重複して数えず、成功した正規URLで確認したものを上の100件に掲載した。

| 名称 | URL | 理由 |
| --- | --- | --- |
| E・レシピ | [E・レシピ](https://erecipe.woman.excite.co.jp/) | web openは403 Forbidden。本文未取得のため25件には含めず、他サイトに置換。 |
| レタスクラブ | [レタスクラブ](https://www.lettuceclub.net/recipe/) | web openは404 Not Found。トップURLでも404となった。このツールでの取得結果でありサービス終了の断定ではない。 |
| 旧レシピブログ | [旧レシピブログ](https://foodistnote.recipe-blog.jp/recipeblog-closed/) | https://www.recipe-blog.jp/をweb openすると公式終了案内へ転送。2025年6月30日の終了とフーディストノートへの移行を本文確認。現行サイトのみ1件に計上。 |
| リュウジ バズレシピ | [リュウジ バズレシピ](https://bazurecipe.com/) | web openは403 Forbidden。本文未取得のため件数に含めない。 |
| 栗原はるみ旧レシピURL | [栗原はるみ旧レシピURL](https://www.yutori.co.jp/shop/rp/rp.aspx) | このURLはツールで取得不能。/recipe/から転送される現行/shop/rpc/rpc0/を別途web openで本文確認済み。 |
| ニチレイフーズ ほほえみごはん | [ニチレイフーズ ほほえみごはん](https://www.nichireifoods.co.jp/media/) | 公式の検索結果は取得できたが、トップ・別URL・検索結果URLのopenが取得エラー。成功25サイトには含めずオタフクソースで補充。 |
| 七福醸造 季節のレシピ | [七福醸造 季節のレシピ](https://7fukuj.co.jp/recipe_type/list/) | 公式一覧の本文は確認したが、個別レシピはCookpadへの外部リンク。自社レシピ本文の調査対象としては件数外とし桃屋で補充。 |
| BBC Food | [BBC Food](https://www.bbc.co.uk/food) | robots.txt による取得拒否 |
| Food52 | [Food52](https://food52.com/) | 取得失敗 |
| Epicurious | [Epicurious](https://www.epicurious.com/) | 本文サイズ上限で取得失敗 |
| NYT Cooking | [NYT Cooking](https://cooking.nytimes.com/) | 取得失敗。有料壁の有無・内容はこの結果から判断不可 |
| Copy Me That | [Copy Me That](https://www.copymethat.com/) | 403 |
| BigOven | [BigOven](https://www.bigoven.com/) | 403 |
| Tasty | [Tasty](https://tasty.co/) | robots.txtによる取得拒否 |
| Kitchen Stories | [Kitchen Stories](https://www.kitchenstories.com/en) | 利用規約本文を取得。料理機能の比較から除外 |
| Forks Over Knives | [Forks Over Knives](https://www.forksoverknives.com/) | ショップへ転送。献立ページ本文は取得できず |
| SuperCook | [SuperCook](https://www.supercook.com/) | JavaScript未実行時の代替文のみ |
| Lifesum | [Lifesum](https://www.lifesum.com/) | 取得失敗 |

## 技術と公開方針の補助資料

以下は料理サイト100件とは別枠で確認した一次資料。

- [GitHub Pagesの概要](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pagesの制限](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHubのライセンス説明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [Creative Commonsのライセンス一覧](https://creativecommons.org/cc-licenses/)
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [農林水産省 食中毒予防のポイント](https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/point.html)
