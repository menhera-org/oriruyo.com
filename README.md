# 降りるよ.com (oriruyo.com)

現在乗車中の列車、路面電車、バスのあなたが降りる地点を分かりやすく画面に表示するアプリです。

これをあなたのスマホやタブレットの画面に表示しておけば、空き席待ちの人にも分かりやすく親切！

一旦起動すれば、オフラインでも使えます。

## Deployment

`public/` is published by the GitHub Pages workflow on pushes to `main`.
Set the Pages source to **GitHub Actions** and configure `oriruyo.com` as the
custom domain in the repository's Pages settings.

## CSS conventions

- Use `em`, `rem`, `vi`, or `vb` for CSS lengths. Unitless zero is fine; avoid
  absolute units such as `px` and `pt`, and physical viewport units such as
  `vw` and `vh`.
- Use logical properties and values for direction: `inline-size` and
  `block-size`, `margin-inline` and `margin-block`, `padding-inline` and
  `padding-block`, and `start` or `end` alignment. Avoid physical directions
  such as `left`, `right`, `top`, and `bottom`.
- Keep styles in `public/main.css` or the existing constructed stylesheet in
  `public/main.js`. Do not add inline style attributes under the page's CSP.

## License

Apache-2.0.
