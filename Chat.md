## 🤖 Sample Chat Cases & Lead Handling

### 1. Qualified Lead: Office Space Inquiry & Visit Request

**User:** I’m looking for a small office space in Santiago.  
**Bot:** Perfect! 🚀 What office size do you need (in sq.m)?  
**User:** 50 sq.m  
**Bot:** What’s your monthly budget?  
**User:** $1,000  
**Bot:** Do you need it furnished?  
**User:** Yes  
**Bot:** We have a 50 sq.m furnished office in Telunage for $950/month. Want to see some images?  
**User:** Yes, send.  
**Bot:** *(Sends images)*  
**User:** I wish to visit this place.  
**Bot:** Please share your WhatsApp or email so our experts can contact you.  
**User:** +1234567890, john@email.com  
**Bot:** Thank you! Our team will reach out to schedule your visit.

**DB Outcome:**  
- `Lead`: status = HIGH, requirements, contact info saved  
- `ChatHistory`: all messages logged  
- `FollowUp`: activity = "Visit Requested", status = PENDING

---

### 2. Medium Lead: Residential Inquiry, No Contact

**User:** I want a 2BHK apartment in Lima.  
**Bot:** Great! What’s your budget?  
**User:** $150,000  
**Bot:** When do you plan to move?  
**User:** Not sure, maybe next year.  
**Bot:** No problem! Would you like to see some listings or get market updates?  
**User:** Just browsing for now.  
**Bot:** Let me know if you want more info or to schedule a visit anytime!

**DB Outcome:**  
- `Lead`: status = MEDIUM, requirements saved, no contact  
- `ChatHistory`: all messages logged

---

### 3. Lead Magnet: Market Trends & Guide Download

**User:** How’s the real estate market in Dubai?  
**Bot:** Here’s a quick snapshot: construction up 8%, avg. price AED 1,500/sq.ft, rental yields up to 7.2%. Want a free investment guide PDF?  
**User:** Yes  
**Bot:** Please share your email or WhatsApp to send the guide.  
**User:** john@email.com  
**Bot:** Guide sent! Let me know if you want to speak to an expert.

**DB Outcome:**  
- `Lead`: status = MEDIUM, contact info saved  
- `ChatHistory`: all messages logged  
- `FollowUp`: activity = "Guide Sent" (optional)

---

### 4. Investor Lead: High Intent

**User:** I’m an investor looking for good ROI in Lima.  
**Bot:** What’s your investment range?  
**User:** $200,000  
**Bot:** Are you looking for rental income or flip deals?  
**User:** Rental income  
**Bot:** Which cities interest you most?  
**User:** Lima and Santiago  
**Bot:** Please share your WhatsApp or email for a curated list.  
**User:** +1234567890  
**Bot:** Thanks! Our team will send you top picks soon.

**DB Outcome:**  
- `Lead`: status = HIGH, investor flag, contact info saved  
- `ChatHistory`: all messages logged  
- `FollowUp`: activity = "Investor Lead"

---

### 5. International Buyer

**User:** I live in the US, can I buy in Peru?  
**Bot:** Yes! What’s your budget and do you need legal help?  
**User:** $300,000, yes I need legal help.  
**Bot:** Please share your WhatsApp or email so our specialist can assist you.  
**User:** +1987654321  
**Bot:** Thank you! Our international team will contact you soon.

**DB Outcome:**  
- `Lead`: status = HIGH, international flag, contact info saved  
- `ChatHistory`: all messages logged  
- `FollowUp`: activity = "International Buyer"

---

### 6. Builder/Partner Inquiry

**User:** I’m a builder, want to list my project.  
**Bot:** What type of projects and which cities do you cover?  
**User:** Residential, Lima  
**Bot:** How many units available now?  
**User:** 10  
**Bot:** Please share your company name and contact info.  
**User:** ABC Constructions, abc@build.com  
**Bot:** Thanks! Our team will reach out to you soon.

**DB Outcome:**  
- `Lead`: status = HIGH, builder info, contact info saved  
- `ChatHistory`: all messages logged  
- `FollowUp`: activity = "Builder Inquiry"

---

### 7. Lead Magnet Download, No Contact

**User:** I want your free investment guide.  
**Bot:** Please provide your WhatsApp or email to receive the guide.  
**User:** No thanks, just browsing.  
**Bot:** No problem! Let me know if you want more info anytime.

**DB Outcome:**  
- `Lead`: status = NOT_QUALIFIED, no contact  
- `ChatHistory`: all messages logged

---

### 8. Property Valuation

**User:** What’s my property worth in Callao?  
**Bot:** Where is it located and what’s the size?  
**User:** Downtown Callao, 120 sq.m  
**Bot:** Is it residential or commercial?  
**User:** Residential  
**Bot:** Here’s an estimate: $220,000–$240,000. Want a detailed report to your WhatsApp or email?  
**User:** +1234567890  
**Bot:** Report sent!

**DB Outcome:**  
- `Lead`: status = MEDIUM, valuation info, contact info saved  
- `ChatHistory`: all messages logged  
- `FollowUp`: activity = "Valuation Report"

---

### 9. Visit Request, Fake Contact

**User:** Can I visit the property in Lima?  
**Bot:** Please share your WhatsApp or email to schedule a visit.  
**User:** 12345  
**Bot:** That doesn’t look like a valid number. Could you check and resend?  
**User:** I don’t want to share.  
**Bot:** No worries! You can still browse listings.

**DB Outcome:**  
- `Lead`: status = NOT_QUALIFIED, no valid contact  
- `ChatHistory`: all messages logged

---

### 10. Useless/Time-Pass User

**User:** Hi, what’s your favorite color?  
**Bot:** I’m here to help you with real estate questions! Looking for a property or market info?  
**User:** No, just time pass.  
**Bot:** No worries! Let me know if you need anything related to real estate.

**DB Outcome:**  
- `Lead`: not created or status = NOT_QUALIFIED  
- `ChatHistory`: all messages logged

---

> **Note:**  
> - All conversations are logged in `ChatHistory`.  
> - Leads are created/updated in `Lead` with appropriate status.  
> - Important actions (like visit requests) are tracked in `FollowUp`.  
> - Properties are suggested from the `Property` table.
