# En Stor Läsk Review

A Swedish soda review guide built with SvelteKit, TypeScript, Tailwind CSS, and MapLibre. GitHub Pages serves prerendered pages; there is no application server, database, login, or server-side editor. A browser form generates review files locally.

## Development

Use Node **24.16.0** (see `.node-version`) and **pnpm 12.8.1** (pinned in `package.json`). Install pnpm through its official installation instructions: https://pnpm.io/installation.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm validate:content
pnpm check
pnpm lint
pnpm test:unit --run
pnpm exec playwright install chromium
pnpm test:integration
pnpm build
pnpm preview
```

Playwright builds only clearly labelled test reviews in a temporary asset directory. Run `pnpm build` afterward to restore the production build from `content/reviews` and `content/reviews/images`. No `.env` or MongoDB is required.

## Add or edit a review

Open `/skapa/` directly (the generator is not linked in the public navigation) to generate one soda review locally. Fill in the soda name, author, free text, image, eight scores (0–5, half points allowed), favorite status, and optionally repurchase potential (0–5, whole points) and the price you paid. The form previews the total rating (0–3) and weighted score (0–5) as you edit; it uses the same calculation as the published review. Empty or out-of-range scores hide the preview, and venue scores do not affect it. Each reviewer publishes their own JSON file, slug, image, text, scores, price, container, volume, and dates, even when reviewing the same soda. New slugs are suggested from the soda name and author; change the slug if needed to distinguish multiple reviews by the same author. Download both files, then place the JSON in `content/reviews/` and the WebP in `content/reviews/images/`. The form removes original image metadata (including EXIF/GPS), resizes images to at most 1,600 pixels, and compresses them to WebP at quality 82%, reducing quality and dimensions further if needed to stay within 500 KiB. The resulting size is shown before download. Adjust zoom (100–300%) and horizontal/vertical image position in the 16:9 preview to choose the crop shown on review pages and cards. Positioning also works when editing an existing image; the focus percentages and optional `imageZoom` multiplier (1–3, default 1) are saved in JSON. Zoom only changes the displayed crop; the downloaded image remains full-sized. Nothing is uploaded or saved between visits.

See [the soda JSON example](docs/soda-review-example.json); replace all example content before publishing. All fields belong directly to the review object. Nested `reviews` arrays are rejected; there are no shared product prices or combined reviewer ratings. To edit a review, use **Ladda in recension från JSON** beneath the generator heading to load its saved `<slug>.json`, or select a published review with **Redigera en befintlig recension**. The JSON import runs the shared validator and accepts soda reviews up to 256 KiB. Invalid files leave the current form intact. Edit the populated form and replace the review’s JSON file with the downloaded version. **Skapa ny recension** clears the loaded review. If an imported image is not on the site, select its image file to preview it; the existing filename can still be retained when exporting JSON. Its slug and creation date are retained, along with its image when no replacement is selected. Replacement images get a new WebP filename; remove the old image if no review references it. A new image download is only necessary when replacing the image.

To link independent reviews of the same soda, give them the same optional `sodaId`, for example `pepsi-max-tropical`. IDs contain lowercase a–z, digits, and single separating hyphens, up to 100 characters. The generator automatically creates a soda ID from the drink title, excluding the author, and limits this default to 100 characters. It lets you select a previously reviewed soda or enter a name or ID instead. Clearing a custom ID restores the automatic title-based value. Imported reviews without an ID receive this default when exported. Typed names are formatted into lowercase IDs with hyphens, and the form previews exactly which ID will be saved. Existing valid IDs remain unchanged; published JSON is still validated strictly. Selecting a soda fills its title and brand; your author, price, text, image and scores stay independent. Editing preserves the ID. Detail pages list other reviews with the exact same ID, showing their authors and own scores. Different titles may share an ID; matching titles alone never create links. Reviews without an ID remain valid and unlinked. IDs do not change public review slugs.

The optional `container` records what the reviewer drank from. Choose `Burk`, `Flaska`, `Glasflaska`, `SodaStream smak`, `Sprutmaskin`, or `Annan`. Choosing `Annan` requires a separate `customContainer` label of 1–80 characters without surrounding whitespace or control characters; other container types must omit that field. Choose volume separately; `volumeMl` is stored in ml, for example `330` for 33 cl or `1500` for 1.5 l. Choose **Annan volym** to enter a positive volume in ml, including decimals. Existing unusual volumes open in that input when editing. Either field may be omitted when unknown. Combined container values (such as `Burk 33cl`) are rejected. There is no automatic conversion.

Soda ratings are `taste`, `sweetness`, `carbonation`, `mouthfeel`, `mouthfeelMatch`, `drinkability`, `matchesName`, and `value`. Sweetness measures intensity (0 = not sweet, 3 = perfect, 5 = too sweet). Its balance rises linearly from 0 at intensity 0 to 5 at intensity 3, then falls linearly to 0 at intensity 5. Consistency measures runniness (0 = thick, 5 = very runny); only `mouthfeelMatch` affects quality. Weights: taste 30%; sweetness balance, carbonation, and drinkability 15% each; consistency suitability and matching the name 10% each; value 5%. Apply the 0–3 thresholds (2, 3.25, 4.5) to each review's own precise score. Recommendations are explicit choices independent of the numeric score.

LPK (läsk per krona) is volume divided by the review's own price, displayed in cl/kr. Optional `volumeMl` supplies volume (use the finished drink for SodaStream or fountain soda), and optional `beerPriceKr` supplies the purchase price. Missing volume or price hides LPK. These facts do not affect ratings.

Set `isEnergyDrink: true` for an energy drink and supply either `caffeineMgPer100Ml` or `caffeineMgPerContainer` from the label. Optional carbohydrates use `carbohydrateGPer100Ml` or `carbohydrateGPerContainer`; protein uses `proteinGPer100Ml` or `proteinGPerContainer`. Enter only one basis per nutrient, with finite nonnegative values (zero is known; omission means unknown). The generator lets you choose either basis and converts when `volumeMl` is known. Without a volume, switching basis clears the input; the site displays only the supplied basis. KPL (kolhydrat per läsk) and PPL (protein per läsk) show totals for the reviewed volume. Use `isElectrolyteDrink: true` for an electrolyte drink (a manual choice according to the label, combinable with the other types and filterable with `drinkType=electrolyte`), `isProteinDrink: true` and `sugarType: "sugar-free"` or `"sugared"` according to the label; published sugar type remains explicit. In the generator, positive caffeine/protein suggest energy/protein classifications, positive carbohydrates suggest Sockrad and zero carbohydrates suggest Sockerfri. Suggestions work in either nutrient basis and update when values are cleared. Users can override them (e.g. caffeinated cola or non-sugar carbohydrates) and restore automatic choices. Existing explicit classifications are preserved on import; false energy/protein overrides are exported as false. Home filters combine these types with AND and preserve them as repeated `drinkType` URL parameters. Optional `servingMethods` accepts multiple unique choices: `Originalförpackning`, `Glas`, `Sugrör`, `Mugg`. Packaging records what the drink was sold in; serving records how it was consumed. Optional `servingTemperature` accepts `Kylskåpskall`, `Rumstempererad`, `Varm`; `servedWithIce` is a boolean (omit when unknown). These appear on the review page and do not change ratings. Cards omit caffeine. Card types share the author row, and nutritional facts fit within the existing brand/price panel. The image retains its full area.

The home page filters independent posts by reviewer and sorts by their own score. Reviewer filtering is shareable through `?reviewer=<normalized-name>`. Each detail page shows one review. Optional `venueRatings` has `atmosphere`, `service`, `selection`, `cleanliness`, and `soundLevel`; these do not affect the soda score. For compatibility, `beerBrand` and `beerPriceKr` also hold soda brand and price. `location` may be empty for soda posts.

`favorite: true` marks an explicitly chosen **Läskfavorit**, a soda the reviewer actively prefers over others. Optional `repurchasePotential` is an integer from 0 to 5 (0 = Aldrig igen, 5 = Given i kylen), shown separately and excluded from the overall score. Missing values are unassessed, not zero. Legacy `recommended` remains accepted but does not grant favorite status; reassess it explicitly in the generator. Favorites can be filtered through `?favorite=1`.

Legacy soda ratings without `mouthfeelMatch` retain their original five-score average. Existing bar reviews retain their original fields and weights; never mix formats. Legacy co-author credits do not establish independent reviews or scores.

To edit existing bar-format content manually:

1. Copy [the example JSON](docs/review-example.json) to `content/reviews/<slug>.json`. Replace all example text and fields; do not publish a test review.
2. Keep the filename and `slug` identical. Published slugs must stay stable. Reserved route names such as `about`, `karta`, and `statistik` are rejected.
3. Write `description` as a JSON string with supported Markdown. Use `\n` for line breaks. Raw HTML, links, and embedded images are disabled.
4. Set all eight rating aspects to values from 0 to 5. The overall 0–3 rating is calculated automatically; do not add a `rating` field. Author credits are independent of Git commit authors.
5. Use UTC ISO dates, for example `2025-01-01T12:00:00.000Z`. Preserve `createdAt`, and update `updatedAt` when editing.
6. Prepare a JPEG, PNG, or WebP image: auto-rotate, remove EXIF/location metadata, and resize appropriately. Place it in `content/reviews/images` and enter only its filename in `image`. Prefer the generator’s compressed WebP output (at most 500 KiB). Manually prepared images must be at most 10 MiB. Image signatures are validated; this does not verify that metadata was removed. Keep names limited to letters, numbers, `_`, and `-`. Use a new filename when replacing an image to avoid stale browser caches; remove the old file if it is no longer referenced.
7. Optionally set both `latitude` and `longitude` for the bar. Missing coordinates omit only the map marker. Coordinates are entered manually, never looked up during builds or visitor sessions.
8. Optional `beerPriceKr` is a number between 1 and 999 with at most one decimal place. The generator accepts both comma and period decimal separators. `isHappyHourPrice: true` requires a price. Optional image focus values are percentages from 0 to 100.
9. Run validation and checks, open a pull request, and merge when checks pass. GitHub Actions then builds and publishes the site.

**All committed content may be public before deployment.** Keep private drafts, backups, credentials, and database dumps outside the repository. There is no draft field. Unknown fields are rejected to prevent accidental export of private database data. Every image in `content/reviews/images` must be referenced by a review. Public history links point to the JSON file's GitHub history; legacy change logs stay in your private backup.

## Migrate the existing site

Back up the production database and uploads first. Migration tooling is isolated in `tools/migration` and is not installed by a normal application install.

```sh
pnpm --dir tools/migration install --ignore-workspace --frozen-lockfile
```

Set `MONGO_URI` and `REVIEW_IMAGE_DIR` in your shell using your existing secure credential handling. Do not put credentials in commands committed to Git or send them to Actions. With those variables set:

```sh
node tools/migration/export.ts /tmp/enstorstark-export
```

The output directory must not exist. The exporter reads only `published` reviews and legacy reviews with no status. It copies only referenced, validated raster images and saved resolved geocodes. It never exports users, audit logs, private drafts, or change-log contents. Images previously processed by the application already have EXIF stripped; the exporter preserves their bytes. A failed export may leave a partial directory; start a fresh export to a different path.

Review `report.json`, especially rating differences and omitted invalid prices. Resolve content validation failures without widening the public-status filter. After reviewing the export, copy its review JSON to `content/reviews` and its images to `content/reviews/images`, then run `pnpm validate:content` and the full checks. Keep the report and backups outside committed content.

Take a final export before cutover so edits made during migration are included. Verify review counts, content, prices, authors, images, map markers, and desktop/mobile appearance against the current public site. Retain the existing deployment and backups until acceptance passes.

## GitHub Pages

The included workflow targets `https://Flawl3ssSWE.github.io/enstorlaskreview/` and the repository's `main` branch.

1. In repository Settings → Pages, select **GitHub Actions** as the publishing source.
2. Configure the `github-pages` environment to accept deployment only from `main`.
3. Protect `main`: require pull requests and the build and dependency-review checks, block force pushes/deletion, and require CODEOWNER review for sensitive files when another maintainer is available to review. CODEOWNERS alone does not enforce review. Maintainers should enable 2FA/passkeys and restrict write access.
4. Enable Dependabot alerts/security updates and secret scanning/push protection where available. Dependency review requires a public repository or the applicable private-repository security entitlement.
5. Merge the migration only after content acceptance. GitHub Actions deploys automatically; this local implementation does not change repository settings or publish anything.

For a custom domain or an account-level Pages site, change workflow `BASE_PATH` to an empty string and configure the domain in Pages settings. For a renamed repository, update the base path and `src/lib/site.ts` history destination. Local testing of the project path:

```sh
BASE_PATH=/enstorlaskreview pnpm test:integration
BASE_PATH=/enstorlaskreview pnpm build
BASE_PATH=/enstorlaskreview pnpm preview
```

The build renders every review and legacy history path, emits `404.html` and `.nojekyll`, and bundles CSS and map workers. It uses a hash-based CSP in HTML. GitHub Pages cannot reproduce the old server's custom security, cache, and permissions headers; CSP `frame-ancestors` also cannot be enforced through a meta tag. Stronger response-header control requires a hosting layer that supports it.

## Supply-chain controls

- Direct packages and the package manager are pinned; `pnpm-lock.yaml` contains exact transitive resolutions and integrity values. CI installs with `--frozen-lockfile`.
- `pnpm-workspace.yaml` enforces a seven-day minimum release age, fails on missing release timestamps, verifies store integrity, and blocks exotic transitive dependency sources. The release delay reduces risk; it is not a guarantee of safety.
- Dependency lifecycle scripts require an explicit allow/deny decision. No dependency install scripts are currently allowed; unnecessary native fallback scripts are explicitly denied. New unreviewed scripts fail installation. Review exact versions, script contents, dependency diffs, and any policy exceptions before committing updates. Never blanket-enable dependency scripts.
- GitHub Actions are pinned to verified release commit SHAs. Dependabot proposes package and action updates weekly; updates are not automatically merged. Dependency review blocks newly introduced known high/critical vulnerabilities, and CI audits the full graph before each build; neither can identify all malicious packages.
- Build/test jobs have read-only repository tokens and no application secrets. The privileged deployment job performs no checkout, installation, or repository script execution. Only the checked artifact from the same default-branch workflow is deployed. PR artifacts are never deployed.
- OpenFreeMap provides external map data only after acceptance in the map overlay. The map does not request browser location, and acceptance is not persisted. Fonts are bundled locally. The site uses no analytics scripts or analytics cookies. Local bundling and CSP reduce exposure but do not make a compromised build trustworthy.
- `source-commit.txt` records the deployed commit. To roll back, revert the problematic change through a reviewed PR and redeploy. Keep the last successful deployment and private pre-migration backups available. If a compromised dependency is suspected, isolate affected artifacts/caches, investigate, and rotate any exposed credentials before rebuilding.
