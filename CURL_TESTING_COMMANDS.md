# 🧪 BILLUN BACKEND - CURL TESTING COMMANDS

## 🔧 BASIC SETUP

```bash
# Set the API base URL (adjust if your server runs on different port)
export API_BASE="http://localhost:5000"

# Create a temp file to store the auth token
export TOKEN_FILE="/tmp/billun_token"
```

## 1️⃣ HEALTH CHECK

```bash
# Test if server is running
curl -X GET $API_BASE/ \
  -H "Content-Type: application/json" \
  -v

# Expected response: "Billun Backend API is running"
```

## 2️⃣ USER REGISTRATION & AUTHENTICATION

```bash
# Register a new user (will return a token)
curl -X POST $API_BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Manager",
    "email": "test@billun.com",
    "password": "test123",
    "phone": "+33123456789",
    "role": "manager"
  }' \
  -v

# Extract and save token (run this after registration)
curl -X POST $API_BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Manager",
    "email": "test@billun.com",
    "password": "test123",
    "phone": "+33123456789",
    "role": "manager"
  }' \
  -s | jq -r '.token' > $TOKEN_FILE

# If user already exists, login instead
curl -X POST $API_BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@billun.com",
    "password": "test123"
  }' \
  -s | jq -r '.token' > $TOKEN_FILE

# Verify token was saved
echo "Token: $(cat $TOKEN_FILE)"
```

## 3️⃣ COMPANY MANAGEMENT

```bash
# Create a company (requires auth token)
curl -X POST $API_BASE/api/companies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -d '{
    "name": "Test Transport Company",
    "siret": "12345678901234"
  }' \
  -v

# Get all companies
curl -X GET $API_BASE/api/companies \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Get specific company by ID (replace COMPANY_ID)
curl -X GET $API_BASE/api/companies/COMPANY_ID \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v
```

## 4️⃣ EQUIPMENT MANAGEMENT

```bash
# Create equipment
curl -X POST $API_BASE/api/equipment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -d '{
    "internalId": "TRUCK-001",
    "licensePlate": "AB-123-CD",
    "name": "Test Truck",
    "type": "truck",
    "brand": "Volvo",
    "model": "FH16",
    "fuelType": "diesel",
    "currentMileage": 150000,
    "emptyWeight": 7500,
    "length": 12.5,
    "width": 2.5,
    "height": 4.0
  }' \
  -v

# Get all equipment
curl -X GET $API_BASE/api/equipment \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Search equipment by Billun ID (replace BILLUN_ID)
curl -X GET "$API_BASE/api/equipment/search?billunId=BLN-2024-XXXXXX" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v
```

## 5️⃣ DASHBOARD ENDPOINTS

```bash
# Get dashboard overview
curl -X GET $API_BASE/api/dashboard/overview \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Get equipment health
curl -X GET $API_BASE/api/dashboard/equipment-health \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Get analytics (last 30 days)
curl -X GET "$API_BASE/api/dashboard/analytics?period=30d" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Get notifications
curl -X GET $API_BASE/api/dashboard/notifications \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v
```

## 6️⃣ PHOTO MANAGEMENT

```bash
# Get photo statistics
curl -X GET $API_BASE/api/photos/stats/dashboard \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Upload a photo (requires actual image file)
curl -X POST $API_BASE/api/photos/upload \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -F "photos=@/path/to/your/image.jpg" \
  -F "anomalyId=ANOMALY_ID_HERE" \
  -F 'geolocation={"latitude":46.5197,"longitude":6.6323,"accuracy":5}' \
  -v

# Get photo gallery for anomaly (replace ANOMALY_ID)
curl -X GET $API_BASE/api/photos/gallery/ANOMALY_ID \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v
```

## 7️⃣ ANOMALY MANAGEMENT

```bash
# Create an anomaly
curl -X POST $API_BASE/api/anomalies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -d '{
    "equipment": "EQUIPMENT_ID_HERE",
    "description": "Test anomaly report",
    "criticality": "minor",
    "immobilizationStatus": "mobile",
    "location": "Test location"
  }' \
  -v

# Get all anomalies
curl -X GET $API_BASE/api/anomalies \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Get anomalies by criticality
curl -X GET "$API_BASE/api/anomalies?criticality=critical" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v
```

## 8️⃣ PARTNERSHIP MANAGEMENT

```bash
# Create a partnership invitation
curl -X POST $API_BASE/api/partnerships/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -d '{
    "partnerCompanyName": "Partner Transport Co",
    "contactPerson": {
      "name": "John Partner",
      "email": "john@partner.com",
      "phone": "+33987654321"
    },
    "invitationMessage": "Would like to establish a partnership for equipment monitoring"
  }' \
  -v

# Get all partnerships
curl -X GET $API_BASE/api/partnerships \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v

# Accept a partnership (replace PARTNERSHIP_ID)
curl -X PUT $API_BASE/api/partnerships/PARTNERSHIP_ID/accept \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -v
```

## 🔧 UTILITY COMMANDS

### Extract specific data from responses:

```bash
# Get user ID from login response
USER_ID=$(curl -X POST $API_BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@billun.com","password":"test123"}' \
  -s | jq -r '.user.id')

# Get company ID from companies list
COMPANY_ID=$(curl -X GET $API_BASE/api/companies \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -s | jq -r '.companies[0]._id')

# Get equipment ID from equipment list
EQUIPMENT_ID=$(curl -X GET $API_BASE/api/equipment \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -s | jq -r '.equipment[0]._id')

echo "User ID: $USER_ID"
echo "Company ID: $COMPANY_ID"
echo "Equipment ID: $EQUIPMENT_ID"
```

### Pretty print JSON responses:

```bash
# Add | jq '.' to any curl command for pretty JSON
curl -X GET $API_BASE/api/dashboard/overview \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -s | jq '.'
```

## 🚨 ERROR TESTING

```bash
# Test unauthorized access (should return 401)
curl -X GET $API_BASE/api/dashboard/overview \
  -v

# Test invalid token (should return 401)
curl -X GET $API_BASE/api/dashboard/overview \
  -H "Authorization: Bearer invalid_token" \
  -v

# Test missing fields (should return 400)
curl -X POST $API_BASE/api/equipment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -d '{"invalidField": "test"}' \
  -v
```

## 📋 QUICK TEST SEQUENCE

```bash
# Run this sequence to test core functionality:
echo "1. Health check..."
curl -s $API_BASE/ | echo "Response: $(cat)"

echo "2. User registration..."
curl -X POST $API_BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"quicktest@billun.com","password":"test123","role":"manager"}' \
  -s | jq -r '.token' > $TOKEN_FILE

echo "3. Dashboard overview..."
curl -X GET $API_BASE/api/dashboard/overview \
  -H "Authorization: Bearer $(cat $TOKEN_FILE)" \
  -s | jq '.stats'

echo "✅ Basic tests completed!"
```

---

## 📝 NOTES:

- Replace `localhost:5000` with your actual server address
- Install `jq` for JSON parsing: `sudo apt install jq`
- Make sure your Billun server is running before testing
- Some endpoints require existing data (equipment, anomalies) to return meaningful results
- Use `-v` flag for verbose output, `-s` for silent mode
