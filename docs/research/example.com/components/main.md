# example.com — Main content

**URL:** https://example.com
**INTERACTION MODEL:** static (no scroll/hover-driven UI)

## Layout
- Centered block on white page
- Single `h1`, one `p`, one link

## Tokens (computed)
```json
{
  "title": "Example Domain",
  "body": {
    "backgroundColor": "rgb(238, 238, 238)",
    "color": "rgb(0, 0, 0)",
    "fontFamily": "system-ui, sans-serif",
    "margin": "120px 256px",
    "display": "block"
  },
  "h1": {
    "tag": "h1",
    "text": "Example Domain",
    "href": null,
    "css": {
      "color": "rgb(0, 0, 0)",
      "backgroundColor": "rgba(0, 0, 0, 0)",
      "fontFamily": "system-ui, sans-serif",
      "fontSize": "24px",
      "fontWeight": "700",
      "lineHeight": "normal",
      "marginTop": "16.08px",
      "marginBottom": "16.08px",
      "textAlign": "start",
      "maxWidth": "none",
      "padding": "0px"
    }
  },
  "p": {
    "tag": "p",
    "text": "This domain is for use in documentation examples without needing permission. Avoid use in operations.",
    "href": null,
    "css": {
      "color": "rgb(0, 0, 0)",
      "backgroundColor": "rgba(0, 0, 0, 0)",
      "fontFamily": "system-ui, sans-serif",
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "normal",
      "marginTop": "16px",
      "marginBottom": "16px",
      "textAlign": "start",
      "maxWidth": "none",
      "padding": "0px"
    }
  },
  "a": {
    "tag": "a",
    "text": "Learn more",
    "href": "https://iana.org/domains/example",
    "css": {
      "color": "rgb(51, 68, 136)",
      "backgroundColor": "rgba(0, 0, 0, 0)",
      "fontFamily": "system-ui, sans-serif",
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "normal",
      "marginTop": "0px",
      "marginBottom": "0px",
      "textAlign": "start",
      "maxWidth": "none",
      "padding": "0px"
    }
  }
}
```

## Builder brief
Rebuild as a Next.js page at `/demos/example` matching computed styles above.
Use real copy from the live site. No inventing content.
