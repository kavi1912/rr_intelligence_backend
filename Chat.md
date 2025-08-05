
🏡 Example 1: New lead asking about properties

Context: User just entered the chat, is casually exploring.

User:
Hey hey, how’s it going? I’m just starting to look at houses, kinda lost tbh 😅

Bot:
Hey there! 😊 So happy to have you here. No worries — that’s what we’re here for!
Are you looking to buy or rent for now?

User:
Buy, if possible… something chill, not too far from work.

Bot:
Awesome. Mind if I ask you a few quick things to get a better idea of what you’re looking for?

User:
Sure, go ahead.

Bot:
Cool. Any specific area in mind? And are you more into houses, apartments, townhouses…?

User:
Ideally a small house, somewhere near [neighborhood]. Having a little yard would be amazing.

Bot:
Oh, totally — a yard changes everything 🌿
And how many bedrooms are you thinking?

User:
Two would be enough.

Bot:
Perfect. I already have a few ideas. I’ll send you 2 or 3 options to get started, and if any catches your eye, we can set up a visit — no pressure.

⸻

🏗️ Example 2: Client asking for project details

Context: User is already interested in a specific real estate project.

User:
Hey, I saw some renderings of that “Vistas del Lago” project. Are there still units available?

Bot:
Hey! Great eye — that one’s gorgeous 😍
Yep, there are still units available, but they’re going fast. Want me to fill you in on the details?

User:
Yes please. Prices, delivery date, and if there’s parking.

Bot:
Of course. Units start at $110,000 USD for 1-bedroom, and $145,000 for 2-bedrooms.
Estimated delivery: October next year. And yep, underground parking spots are available (sold separately).

User:
How’s the payment plan? Can it be financed?

Bot:
Totally. There’s a direct payment plan with the developer: 30% to reserve, and the rest in monthly payments until delivery.
If you do 12 months, there’s no interest. Want me to send you the full brochure and renders on WhatsApp or email?

User:
WhatsApp’s better.

Bot:
Awesome! Sending it right now 📲 And if you want, I can schedule a quick call with one of our agents to go over any questions.

⸻

🕒 Example 3: Buyer wants to schedule a visit

Context: User saw a listing and wants to visit ASAP.

User:
Hi there! I’m interested in an apartment on Rivadavia 1800 that I saw on Instagram. Can I go see it?

Bot:
Hey! 😊 That’s a nice one. It’s still available. Want to schedule a visit this week?

User:
Yeah, the sooner the better. I work all day but I’m free after 6.

Bot:
No problem. We have slots available Tuesday and Thursday until 7 PM.
Would 6:30 on Tuesday work for you?

User:
Yeah, 6:30 is perfect.

Bot:
Done ✅ Our agent Diego will be waiting for you.
Want me to send you the location and a calendar link so you don’t forget?

User:
Yes please, I always forget everything 😅

Bot:
Sending it now 📍 Thanks for booking! You’re gonna love the place.

⸻

🏘️ Example 4: Seller wants to list a property

Context: User wants to sell a property and is shopping around for the right agency.

User:
Hey, I wanted to know if you guys take properties for sale.

Bot:
Hi! Yes, absolutely. We’d love to help you sell it 😊
Can you tell me a bit more? Is it currently occupied or empty?

User:
It’s empty. It was my aunt’s place. Apartment in Belgrano, one-bedroom.

Bot:
Perfect. Do you have some photos and the address? That way we can give you a free estimate.

User:
Yeah, I’ve got pics, floor plan, the works.

Bot:
Awesome. If you send them here, we’ll get back to you within 24 hours with a market valuation.
And if you’re happy with it, we handle the full listing, social media, and showings — you don’t have to lift a finger.

User:
Nice, sounds good. Do you also help with the paperwork?

Bot:
Totally. From viewings to closing, we’ve got your back. You just sit back and relax 😎

⸻

🧩 Example 5: Casual inquiry turns into qualified lead

Context: User starts with a general question, ends up genuinely interested.

User:
Hey, do you also deal with land or only houses?

Bot:
Hey there! Yes, we also work with land lots 👷‍♂️
Are you looking to buy something specific, or just checking out your options?

User:
Just checking… I’ve got some savings and thought maybe it’s a good time to invest.

Bot:
That’s a great move. Land is always a solid bet if you pick the right spot.
Want me to show you some areas that are growing fast?

User:
Sure, I’m not sure about the area though.

Bot:
No worries. I can send you 2 or 3 options in up-and-coming neighborhoods.
What’s your budget like?

User:
Max $25K USD.

Bot:
Perfect. I’ve got a few semi-urbanized lots around that price. Some in early development, with services included.
Want me to send you photos, locations and payment options?

User:
Yeah, I’m into that.

Bot:
Sending right now! And whenever you want, we can chat and find the one that really fits what you’re looking for 🙌
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
