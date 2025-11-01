# Quick Fix: Failed to Create Sale

## Most Common Issue: Prisma Client Not Regenerated

If you're seeing "Failed to create sale" or "Unknown argument `store_id`", the Prisma client needs to be regenerated.

### Quick Fix (Windows)

1. **Stop your dev server** (Press Ctrl+C in the terminal)

2. **Delete the old Prisma client:**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.prisma
   ```

3. **Regenerate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Alternative: Use the Script

If you have the regeneration script:
```bash
regenerate-prisma.bat
```

## Verify It's Fixed

After regenerating, try creating a sale again. You should see:
- ✅ Sale created successfully
- ✅ Store stock decreased correctly
- ✅ No "Unknown argument store_id" error

## Other Possible Issues

### 1. Insufficient Stock
If you see "Insufficient stock" error:
- Check store stock for the selected store
- Verify you're using the correct store

### 2. Database Connection
If Prisma can't connect:
- Check your `.env` file has correct `DATABASE_URL`
- Verify database is accessible

### 3. Schema Mismatch
If errors persist after regeneration:
- Verify `prisma/schema.prisma` has `store_id` in Sale model (line 257)
- Check database has `store_id` column in `sales` table

## Still Having Issues?

1. Check browser console for detailed error messages
2. Check server logs/terminal for Prisma errors
3. Verify the error message - it should now be more specific after the update

