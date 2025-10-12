# POS System API Endpoints Documentation

## Base URL
All API endpoints are available at: `/api/pos-api`

## Request/Response Format
- **Content-Type**: `application/json`
- **Method**: GET, POST, PUT, DELETE

## API Structure

### GET Requests (Query Parameters)
- `type`: Specifies the data type to retrieve
- `id`: Specifies the ID for single record retrieval (optional)

### POST/PUT Requests (Request Body)
```json
{
  "type": "data_type",
  "id": "record_id", // Only for PUT requests
  "data": {
    // Record data fields
  }
}
```

---

## 📁 Categories API

### Get All Categories
```http
GET /api/pos-api?type=categories
```

### Get Single Category
```http
GET /api/pos-api?type=category&id={cat_id}
```

### Create Category
```http
POST /api/pos-api
Content-Type: application/json

{
  "type": "category",
  "data": {
    "cat_name": "Electronics",
    "cat_code": "ELEC001"
  }
}
```

### Update Category
```http
PUT /api/pos-api
Content-Type: application/json

{
  "type": "category",
  "id": "cat_id_here",
  "data": {
    "cat_name": "Updated Electronics",
    "cat_code": "ELEC001"
  }
}
```

### Delete Category
```http
DELETE /api/pos-api?type=category&id={cat_id}
```

---

## 👥 Customer Categories API

### Get All Customer Categories
```http
GET /api/pos-api?type=customer-categories
```

### Get Single Customer Category
```http
GET /api/pos-api?type=customer-category&id={cus_cat_id}
```

### Create Customer Category
```http
POST /api/pos-api
Content-Type: application/json

{
  "type": "customer-category",
  "data": {
    "cus_cat_title": "VIP Customers"
  }
}
```

### Update Customer Category
```http
PUT /api/pos-api
Content-Type: application/json

{
  "type": "customer-category",
  "id": "cus_cat_id_here",
  "data": {
    "cus_cat_title": "Premium VIP Customers"
  }
}
```

### Delete Customer Category
```http
DELETE /api/pos-api?type=customer-category&id={cus_cat_id}
```

---

## 📂 Subcategories API

### Get All Subcategories
```http
GET /api/pos-api?type=subcategories
```

### Get Single Subcategory
```http
GET /api/pos-api?type=subcategory&id={sub_cat_id}
```

### Create Subcategory
```http
POST /api/pos-api
Content-Type: application/json

{
  "type": "subcategory",
  "data": {
    "cat_id": "parent_category_id",
    "sub_cat_name": "Smartphones",
    "sub_cat_code": "SMART001"
  }
}
```

### Update Subcategory
```http
PUT /api/pos-api
Content-Type: application/json

{
  "type": "subcategory",
  "id": "sub_cat_id_here",
  "data": {
    "cat_id": "parent_category_id",
    "sub_cat_name": "Updated Smartphones",
    "sub_cat_code": "SMART001"
  }
}
```

### Delete Subcategory
```http
DELETE /api/pos-api?type=subcategory&id={sub_cat_id}
```

---

## 👤 Customers API

### Get All Customers
```http
GET /api/pos-api?type=customers
```

### Get Single Customer
```http
GET /api/pos-api?type=customer&id={cus_id}
```

### Create Customer
```http
POST /api/pos-api
Content-Type: application/json

{
  "type": "customer",
  "data": {
    "cus_category": "customer_category_id",
    "cus_type": "RETAIL",
    "cus_name": "John Doe",
    "cus_phone_no": "1234567890",
    "cus_phone_no2": "0987654321",
    "cus_address": "123 Main St",
    "cus_reference": "REF001",
    "cus_account_info": "Account details",
    "other": "Additional info",
    "cus_balance": 100.00
  }
}
```

### Update Customer
```http
PUT /api/pos-api
Content-Type: application/json

{
  "type": "customer",
  "id": "cus_id_here",
  "data": {
    "cus_category": "customer_category_id",
    "cus_type": "WHOLESALE",
    "cus_name": "John Smith",
    "cus_phone_no": "1234567890",
    "cus_address": "456 Oak Ave",
    "cus_balance": 250.00
  }
}
```

### Delete Customer
```http
DELETE /api/pos-api?type=customer&id={cus_id}
```

---

## 🔐 Users API

### Get All Users
```http
GET /api/pos-api?type=users
```

### Get Single User
```http
GET /api/pos-api?type=user&id={user_id}
```

### Create User
```http
POST /api/pos-api
Content-Type: application/json

{
  "type": "user",
  "data": {
    "role": "ADMIN",
    "full_name": "John Admin",
    "email": "admin@example.com",
    "password": "secure_password",
    "is_verified": true,
    "status": "ACTIVE"
  }
}
```

### Update User
```http
PUT /api/pos-api
Content-Type: application/json

{
  "type": "user",
  "id": "user_id_here",
  "data": {
    "role": "SUPER_ADMIN",
    "full_name": "John Super Admin",
    "email": "superadmin@example.com",
    "password": "new_password",
    "status": "ACTIVE"
  }
}
```

### Delete User
```http
DELETE /api/pos-api?type=user&id={user_id}
```

---

## 📊 Response Examples

### Success Response
```json
{
  "cat_id": "cmgnaslut0000f8rg1oj449x6",
  "cat_name": "Electronics",
  "cat_code": "ELEC001",
  "created_at": "2025-01-12T06:00:00.000Z",
  "updated_at": "2025-01-12T06:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Category with this code already exists"
}
```

### List Response
```json
[
  {
    "cat_id": "cmgnaslut0000f8rg1oj449x6",
    "cat_name": "Electronics",
    "cat_code": "ELEC001",
    "created_at": "2025-01-12T06:00:00.000Z",
    "updated_at": "2025-01-12T06:00:00.000Z",
    "_count": {
      "sub_categories": 5,
      "products": 25
    }
  }
]
```

---

## 🔧 Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **500**: Internal Server Error

---

## 🧪 Testing

Use the test suite at: `http://localhost:3000/test-all-apis.html`

This comprehensive test page allows you to test all API endpoints with interactive buttons and real-time feedback.

---

## 📝 Frontend Integration

All frontend pages have been updated to use these endpoints:

- **Categories Page**: `/dashboard/categories`
- **Customer Categories Page**: `/dashboard/customercategory`
- **Subcategories Page**: `/dashboard/subcategories`
- **Customers Page**: `/dashboard/customers`
- **User Management Page**: `/dashboard/usermanagement`

Each page now uses the unified API structure with proper error handling and data validation.

