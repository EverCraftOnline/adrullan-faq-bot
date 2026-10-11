# Patch Notes Image CSS

Add this CSS to your Wix page's custom code section (in addition to your existing patch notes CSS):

```css
/* Patch Notes Images */
.patch-image,
div.patch-image,
[class*="patch-image"] {
    display: block !important;
    margin: 15px auto !important;
    padding: 10px !important;
    max-width: 75% !important;
    width: auto !important;
    height: auto !important;
    text-align: center !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.25) !important;
    border-radius: 6px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.patch-image img,
div.patch-image img,
[class*="patch-image"] img {
    display: block !important;
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    margin: 0 auto !important;
    border-radius: 3px !important;
}
```

## Complete Updated CSS (with images):

```css
/* Category Headers (Content, Bug Fixes, Systems, etc.) */
.patch-header2,
div.patch-header2,
[class*="patch-header2"] {    
    font-size: 21px !important;
    font-weight: 400 !important;
    color: white !important;
    padding-left: 10px !important;
    margin: 0 !important;
}

/* Individual Patch Notes */
.patch-note,
div.patch-note,
[class*="patch-note"] {    
    font-size: 18px !important;
    font-weight: 300 !important;
    color: white !important;
    padding-left: 30px !important;
    margin: 0 !important;
}

/* Patch Notes Images */
.patch-image,
div.patch-image,
[class*="patch-image"] {
    display: block !important;
    margin: 15px auto !important;
    padding: 10px !important;
    max-width: 75% !important;
    width: auto !important;
    height: auto !important;
    text-align: center !important;
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.25) !important;
    border-radius: 6px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.patch-image img,
div.patch-image img,
[class*="patch-image"] img {
    display: block !important;
    max-width: 100% !important;
    width: auto !important;
    height: auto !important;
    margin: 0 auto !important;
    border-radius: 3px !important;
}

/* Spacers - Vertical spacing between sections */
.spacer-5,
div.spacer-5 { height: 5px !important; display: block !important; }
.spacer-10,
div.spacer-10 { height: 10px !important; display: block !important; }
.spacer-15,
div.spacer-15 { height: 15px !important; display: block !important; }
.spacer-20,
div.spacer-20 { height: 20px !important; display: block !important; }
.spacer-25,
div.spacer-25 { height: 25px !important; display: block !important; }
.spacer-30,
div.spacer-30 { height: 30px !important; display: block !important; }
.spacer-35,
div.spacer-35 { height: 35px !important; display: block !important; }
.spacer-40,
div.spacer-40 { height: 40px !important; display: block !important; }
.spacer-45,
div.spacer-45 { height: 45px !important; display: block !important; }
.spacer-50,
div.spacer-50 { height: 50px !important; display: block !important; }
.spacer-55,
div.spacer-55 { height: 55px !important; display: block !important; }
.spacer-60,
div.spacer-60 { height: 60px !important; display: block !important; }
.spacer-65,
div.spacer-65 { height: 65px !important; display: block !important; }
.spacer-70,
div.spacer-70 { height: 70px !important; display: block !important; }
.spacer-75,
div.spacer-75 { height: 75px !important; display: block !important; }
.spacer-80,
div.spacer-80 { height: 80px !important; display: block !important; }
.spacer-85,
div.spacer-85 { height: 85px !important; display: block !important; }
.spacer-90,
div.spacer-90 { height: 90px !important; display: block !important; }
.spacer-95,
div.spacer-95 { height: 95px !important; display: block !important; }
.spacer-100,
div.spacer-100 { height: 100px !important; display: block !important; }

.spacer-clear-all {
    clear: both;
    padding: 0px;
    margin: 0px;
}

/* Optional: Version Header (if you display it separately) */
.patch-header1 {    
    font-weight: 500;
    color: white;
}

/* Optional: Date styling (if displayed separately) */
.patch-date {
    font-size: 14px;
    color: #888888;
    margin-top: -4px;
    margin-bottom: 10px;
    font-style: italic;
}
```

## Style Details:

- **Centered**: `margin: 15px auto` centers the image container
- **Max Width**: `max-width: 75%` keeps images from being too wide (matches Lucerin's suggestion)
- **Padding**: `10px` gives breathing room inside the border
- **Border**: Subtle white border (`rgba(255, 255, 255, 0.25)`) for definition
- **Background**: Slight white tint (`rgba(255, 255, 255, 0.05)`) for depth
- **Shadow**: Soft shadow (`0 2px 8px rgba(0, 0, 0, 0.3)`) for depth
- **Rounded Corners**: `border-radius: 6px` for modern look

## Alternative Styles:

### Minimal Style (just border, no background):
```css
.patch-image,
div.patch-image,
[class*="patch-image"] {
    display: block !important;
    margin: 15px auto !important;
    padding: 12px !important;
    max-width: 75% !important;
    width: auto !important;
    height: auto !important;
    text-align: center !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    border-radius: 6px !important;
}
```

### Bold Style (more prominent):
```css
.patch-image,
div.patch-image,
[class*="patch-image"] {
    display: block !important;
    margin: 20px auto !important;
    padding: 12px !important;
    max-width: 80% !important;
    width: auto !important;
    height: auto !important;
    text-align: center !important;
    background: rgba(255, 255, 255, 0.08) !important;
    border: 2px solid rgba(255, 255, 255, 0.3) !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}
```
