# Patch Notes Formatting Guide

## Overview

This guide teaches how to convert raw Discord chat patch notes into the cleaned, formatted version used in Wix. Follow these rules consistently to maintain professional, readable patch notes.

---

## Core Formatting Rules

### 1. **Headline Case (Title Case)**
- Capitalize the first letter of every major word
- Lowercase articles (a, an, the), conjunctions (and, but, or), and prepositions (in, on, at, for, etc.) unless they're the first word
- Capitalize all nouns, verbs, adjectives, and adverbs

**Examples:**
- ✅ "Warrior: Sweeping Strike Is Now Available When Using 2-Handers"
- ✅ "Added an Option to Toggle On/Off Incoming Floating Healing Text"
- ❌ "warrior: sweeping strike is now available" (all lowercase)
- ❌ "Added An Option To Toggle On/Off" (over-capitalized)

### 2. **Brevity**
- Keep notes concise and to the point
- Remove unnecessary words and filler
- One idea per note
- Aim for 5-15 words per note when possible

**Examples:**
- ✅ "Warrior: Sweeping Strike Is Now Available When Using 2-Handers"
- ❌ "Warrior: The Sweeping Strike ability has now been made available to players who are using two-handed weapons in combat"

### 3. **Punctuation Rules**
- **Only use exclamation marks** for exciting/positive announcements
- Use periods sparingly (only if the note is a complete sentence)
- No question marks (patch notes are statements, not questions)
- No commas unless necessary for clarity
- Use colons after class names (e.g., "Warrior: Ability Name")

**Examples:**
- ✅ "Owl Bears Have Returned to Adrullan!" (exciting content)
- ✅ "Fixed a Bug where Brightness Slider Didn't Work" (no punctuation needed)
- ❌ "Fixed a bug where the brightness slider didn't work." (unnecessary period)
- ❌ "Did we fix the brightness slider?" (question mark not allowed)

### 4. **Light Humor Only**
- Keep humor subtle and professional
- Use sparingly (maybe 1-2 per patch)
- Avoid sarcasm or negative humor
- Emojis are acceptable but rare (use text equivalents when possible)

**Examples:**
- ✅ "Added a Few Extra Blocks of Space to the Math Before We Boot Players for Being Too High 🙂" (light, friendly)
- ✅ "Self Found Isn't as Hard Now that You Can Cast Spells on Yourself :grimacing:" (acknowledges improvement)
- ❌ "Finally fixed this stupid bug that's been annoying everyone" (too negative)

### 5. **Consistent Headings**
Use these standard category headings (always in this order if present):

1. **Content** - New content, zones, NPCs, items, quests
2. **Class** - Class-specific changes (use format: "ClassName: Change")
   - **Class names must be alphabetical** within the Class section
   - **Each change gets its own line** - even if multiple changes are for the same class
   - Keep changes for the same class grouped together (adjacent) in alphabetical order
3. **Systems** - Game systems, mechanics, combat
4. **Interface** or **UI/Chat** - User interface, chat, windows
5. **Crafting** - Crafting-related changes
6. **Guilds** - Guild system changes
7. **Bugs** or **Bug Fixes** - Bug fixes

**Heading Format:**
```html
<div class="patch-header2">Category Name</div>
<div class="spacer-10"></div>
```

### 6. **Consistent Div Structure**

**Category Header:**
```html
<div class="patch-header2">Content</div>
<div class="spacer-10"></div>
```

**Patch Note:**
```html
<div class="patch-note">- Note Text Here</div>
```

**Spacer Between Categories:**
```html
<div class="spacer-30"></div>
```

**Full Example:**
```html
<div class="patch-header2">Content</div>
<div class="spacer-10"></div>
<div class="patch-note">- Owl Bears Have Returned to Adrullan!</div>
<div class="patch-note">- Improved Lighting and Performance of Lights</div>
<div class="spacer-30"></div>
<div class="patch-header2">Class</div>
<div class="spacer-10"></div>
<div class="patch-note">- Warrior: Sweeping Strike Is Now Available When Using 2-Handers</div>
<div class="spacer-30"></div>
```

---

## Processing Workflow

### Step 1: Read Raw Discord Input
Extract the actual patch note content, ignoring:
- Username/author tags
- Timestamps
- Version numbers (unless part of the note)
- "reserve" or placeholder text

### Step 2: Categorize
Group notes by category:
- Content changes
- Class changes
- System changes
- UI/Interface changes
- Bug fixes

### Step 3: Format Each Note
For each note:
1. Apply Headline Case
2. Make it brief
3. Remove unnecessary words
4. Add proper punctuation (only exclamation if exciting)
5. Format class names: "ClassName: Change Description"

### Step 4: Structure with Divs
Wrap in proper HTML structure:
- Category header with spacer-10
- Notes with patch-note class
- spacer-30 between categories

---

## Examples: Before → After

### Example 1: Class Change

**Before:**
```
Skeeter — 12/6/2025 6:22 PM
Warrior: Sweeping Strike is now available when using 2-handers.
```

**After:**
```html
<div class="patch-header2">Class</div>
<div class="spacer-10"></div>
<div class="patch-note">- Warrior: Sweeping Strike Is Now Available When Using 2-Handers</div>
```

**Changes Made:**
- Removed author/timestamp
- Applied Headline Case
- Added to Class category
- Formatted with proper divs

---

### Example 2: Content Change

**Before:**
```
landon — 12/6/2025 3:22 PM
The Imp Mason set to be unique so he can't spawn in more than one place
```

**After:**
```html
<div class="patch-header2">Content</div>
<div class="spacer-10"></div>
<div class="patch-note">- Imp Mason Set to Unique Spawn</div>
```

**Changes Made:**
- Removed author/timestamp
- Made brief: "Set to Unique Spawn" instead of "set to be unique so he can't spawn in more than one place"
- Applied Headline Case
- Categorized as Content

---

### Example 3: Interface Change

**Before:**
```
Skeeter — 12/7/2025 3:51 PM
Interface: Added an option to toggle on/off incomming floating healing text. It shows both heal-over-time and regular heals.
```

**After:**
```html
<div class="patch-header2">Interface</div>
<div class="spacer-10"></div>
<div class="patch-note">- Added Option to Toggle Incoming Floating Healing Text</div>
```

**Changes Made:**
- Removed author/timestamp
- Fixed typo: "incomming" → "Incoming"
- Made brief: removed "It shows both heal-over-time and regular heals" (implied)
- Applied Headline Case
- Removed unnecessary period

---

### Example 4: Guild System

**Before:**
```
Skeeter — 12/7/2025 3:51 PM
Guilds:
The guild window now refreshes all information live without having to close/re-open the window
Officers can no longer kick the leader
In order for a leader to leave their guild, they must first promote a member to leader
```

**After:**
```html
<div class="patch-header2">Guilds</div>
<div class="spacer-10"></div>
<div class="patch-note">- Guild Window Now Refreshes All Information Live</div>
<div class="patch-note">- Officers Can No Longer Kick the Leader</div>
<div class="patch-note">- Leaders Must Promote a Member Before Leaving Guild</div>
```

**Changes Made:**
- Split into separate notes (one per change)
- Made each brief and clear
- Applied Headline Case consistently
- Removed unnecessary words ("In order for", "their guild")

---

### Example 5: Bug Fix

**Before:**
```
Stolistic — 12/7/2025 4:35 PM
Fixed a bug where the brightness slider didn't work for non-GMs
```

**After:**
```html
<div class="patch-header2">Bug Fixes</div>
<div class="spacer-10"></div>
<div class="patch-note">- Fixed Bug where Brightness Slider Didn't Work for Non-GMs</div>
```

**Changes Made:**
- Applied Headline Case
- Kept brief
- Categorized as Bug Fixes

---

### Example 6: Humor Example

**Before:**
```
h1ddentree — 12/7/2025 9:22 PM
Added a few extra blocks of space to the math before we boot players for being to high 🙂
```

**After:**
```html
<div class="patch-header2">Systems</div>
<div class="spacer-10"></div>
<div class="patch-note">- Added Extra Blocks of Space Before Booting Players for Being Too High 🙂</div>
```

**Changes Made:**
- Fixed typo: "to high" → "Too High"
- Kept light humor (emoji)
- Made brief: "a few extra" → "Extra"
- Applied Headline Case

---

### Example 7: Complex Note

**Before:**
```
h1ddentree — 12/7/2025 10:09 PM
If an npc was going to attack another npc, if there is a player in melee range, it will ALWAYS choose the player.
This will make tank's lives easier in groups, and solve some other issues, please give us feedback on this one, as its a big change
This wont apply to an npc trying to decide between attacking a beastwarden pet instead of its master
```

**After:**
```html
<div class="patch-header2">Systems</div>
<div class="spacer-10"></div>
<div class="patch-note">- NPCs Always Target Players in Melee Range Over Other NPCs</div>
<div class="patch-note">- Does Not Apply to Beastwarden Pet Targeting</div>
```

**Changes Made:**
- Condensed three sentences into two clear notes
- Removed meta-commentary ("please give us feedback")
- Made brief and clear
- Applied Headline Case
- Split into two related but separate notes

---

## Common Patterns

### Class Changes
**Format:** `ClassName: Change Description`

**Examples:**
- "Warrior: Sweeping Strike Is Now Available When Using 2-Handers"
- "Druid: Grove Attunement Got New Particle Effect"
- "Rogue: Escape Rope Description Updated to Reflect Correct Functionality"

### Bug Fixes
**Format:** `Fixed Bug where [Issue Description]` or `Fixed [Issue Description]`

**Examples:**
- "Fixed Bug where Brightness Slider Didn't Work for Non-GMs"
- "Fixed Bug where DoT Damage Was Reported as MISSING SKILL 10"
- "Fixed Bug where Auto Keep Fish Tacklebox Setting Wasn't Being Saved"

### New Features
**Format:** `Added [Feature Description]` or `[Feature] Now Available`

**Examples:**
- "Added Option to Toggle Incoming Floating Healing Text"
- "Added Stay/Guard Commands for Pets"
- "Reply Can Now Be Remapped in Keybindings"

### Changes/Updates
**Format:** `[Thing] Now [New Behavior]` or `Updated [Thing]`

**Examples:**
- "Guild Window Now Refreshes All Information Live"
- "Updated Music Zones"
- "NPC Archery Damage Now Scales with Their Level"

---

## Quality Checklist

Before finalizing, check each note:

- [ ] **Headline Case** applied correctly
- [ ] **Brief** - unnecessary words removed
- [ ] **Punctuation** - only exclamation if exciting, no periods unless needed
- [ ] **Humor** - light and professional (if used)
- [ ] **Category** - correct heading used
- [ ] **Div structure** - proper HTML format
- [ ] **Clarity** - easy to understand
- [ ] **Consistency** - matches style of other notes

---

## Special Cases

### Version Numbers
- Include version numbers only if they're part of the note content
- Format: "Patch 0.10.43" or "Version 0.10.43"

### Dates
- Don't include dates in notes (dates are handled separately)
- Remove timestamps from raw input

### Author Names
- Always remove author names/usernames
- Don't include "— Developer Name" in notes

### "Reserve" Placeholders
- Remove "reserve" or placeholder text
- Only include actual patch note content

### Multiple Related Changes
- Split into separate notes if they're distinct changes
- Keep together if they're part of the same feature/system

### Typos in Raw Input
- Fix typos: "incomming" → "Incoming", "to high" → "Too High"
- Maintain professional spelling

---

## Complete Example: Full Patch Processing

### Raw Discord Input:
```
EnigmaFactory — 12/6/2025 12:47 AM
0.10.43

Content 

reserve

reserve

landon — 12/6/2025 3:22 PM
The Imp Mason set to be unique so he can't spawn in more than one place

Skeeter — 12/6/2025 6:22 PM
Warrior: Sweeping Strike is now available when using 2-handers.

Skeeter — 12/7/2025 3:51 PM
Interface: Added an option to toggle on/off incomming floating healing text. It shows both heal-over-time and regular heals.

Stolistic — 12/7/2025 4:35 PM
Fixed a bug where the brightness slider didn't work for non-GMs
```

### Processed Output:
```html
<div class="patch-header2">Content</div>
<div class="spacer-10"></div>
<div class="patch-note">- Imp Mason Set to Unique Spawn</div>
<div class="spacer-30"></div>
<div class="patch-header2">Class</div>
<div class="spacer-10"></div>
<div class="patch-note">- Warrior: Sweeping Strike Is Now Available When Using 2-Handers</div>
<div class="spacer-30"></div>
<div class="patch-header2">Interface</div>
<div class="spacer-10"></div>
<div class="patch-note">- Added Option to Toggle Incoming Floating Healing Text</div>
<div class="spacer-30"></div>
<div class="patch-header2">Bug Fixes</div>
<div class="spacer-10"></div>
<div class="patch-note">- Fixed Bug where Brightness Slider Didn't Work for Non-GMs</div>
<div class="spacer-30"></div>
```

**What Was Removed:**
- Version number (0.10.43) - handled separately
- All author names and timestamps
- "reserve" placeholders
- Meta-commentary ("It shows both...")
- Unnecessary words

**What Was Fixed:**
- Typo: "incomming" → "Incoming"
- Headline Case applied
- Made brief and clear
- Proper categorization
- Correct div structure

---

## Quick Reference

| Rule | Example |
|------|---------|
| **Headline Case** | "Warrior: Sweeping Strike Is Now Available" |
| **Brevity** | "Imp Mason Set to Unique Spawn" (not "The Imp Mason set to be unique so he can't spawn...") |
| **Exclamation Only** | "Owl Bears Have Returned to Adrullan!" |
| **No Periods** | "Added Option to Toggle" (not "Added option to toggle.") |
| **Light Humor** | "Added Extra Blocks... 🙂" |
| **Class Format** | "ClassName: Change Description" |
| **Bug Format** | "Fixed Bug where [Issue]" |

---

## Practice Exercise

Try processing this raw input:

```
Lucerin — 12/7/2025 6:07 PM
Rogue: Escape Rope description updated to reflect that it works correctly now. It no longer sends the group to Bind.

h1ddentree — 12/7/2025 8:49 PM
Older characters will now get Botany and Beekeeping if they were missing it before the quest was removed

Sassage — Yesterday at 7:55 PM
We now refresh our JWT for authenticated api calls when the token is expired or about to expire only instead of continuously checking for jwt expiration, also solves the problem of when session is expired and you return to character select your character list is empty.. we now refresh the session if it is expired
```

**Expected Output:**
```html
<div class="patch-header2">Class</div>
<div class="spacer-10"></div>
<div class="patch-note">- Rogue: Escape Rope Description Updated to Reflect Correct Functionality</div>
<div class="spacer-30"></div>
<div class="patch-header2">Systems</div>
<div class="spacer-10"></div>
<div class="patch-note">- Older Characters Now Get Botany and Beekeeping If Missing</div>
<div class="spacer-30"></div>
<div class="patch-header2">Systems</div>
<div class="spacer-10"></div>
<div class="patch-note">- JWT Now Refreshes Only When Expired or About to Expire</div>
<div class="patch-note">- Session Refreshes Automatically When Expired at Character Select</div>
<div class="spacer-30"></div>
```

---

Remember: **Consistency is key!** Follow these rules every time, and the patch notes will look professional and polished.


