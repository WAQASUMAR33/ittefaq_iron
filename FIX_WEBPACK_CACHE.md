# Fix Webpack Cache Error

## Issue
Webpack cache error during Next.js development:
```
[webpack.cache.PackFileCacheStrategy] Caching failed for pack: Error: ENOENT: no such file or directory
```

## Solution

### Quick Fix
Stop your dev server and clear the Next.js cache:

```bash
# Stop dev server (Ctrl+C)

# Delete .next folder
rm -rf .next
# Or on Windows PowerShell:
Remove-Item -Recurse -Force .next

# Restart dev server
npm run dev
```

### Permanent Fix (Optional)
Add a script to `package.json`:

```json
{
  "scripts": {
    "dev:clean": "rm -rf .next && npm run dev",
    "dev:clean:win": "if exist .next rmdir /s /q .next && npm run dev"
  }
}
```

## Why This Happens
- File system race conditions during hot reloading
- Corrupted cache files
- Multiple processes trying to access cache simultaneously
- Windows file locking issues

## Prevention
- Don't manually delete files while dev server is running
- Close file watchers/external editors if experiencing frequent cache issues
- Use `npm run dev` in a single terminal

