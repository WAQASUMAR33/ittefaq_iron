# Prisma Client Regeneration Required

## Issue
After adding `store_id` field to `Sale` and `SaleDetail` models in the Prisma schema, the Prisma client needs to be regenerated.

## Error
```
Unknown argument `store_id`. Did you mean `sale_id`?
```

## Solution

### Option 1: Automatic (Recommended)
The `postinstall` script in `package.json` should automatically run `prisma generate` after `npm install`. However, if you're seeing this error, try:

1. **Stop your dev server** (Ctrl+C)
2. **Delete node_modules and regenerate:**
   ```bash
   rm -rf node_modules/.prisma
   npm install
   ```
   Or on Windows PowerShell:
   ```powershell
   Remove-Item -Recurse -Force node_modules\.prisma
   npm install
   ```

### Option 2: Manual Regeneration
1. **Stop your dev server** (Ctrl+C)
2. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```
3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Option 3: Full Clean Install
If the above doesn't work:

1. **Stop your dev server** (Ctrl+C)
2. **Clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
   Or on Windows:
   ```powershell
   Remove-Item -Recurse -Force node_modules, package-lock.json
   npm install
   ```

## For Production (Vercel)
The build script already includes `prisma generate`:
```json
"build": "npx prisma generate && next build"
```

So production builds should automatically regenerate the Prisma client. If you're still seeing errors in production:
1. Clear Vercel build cache
2. Redeploy

## Verification
After regeneration, verify the Prisma client recognizes `store_id` by checking:
- No more "Unknown argument `store_id`" errors
- Sales creation works with `store_id` parameter

