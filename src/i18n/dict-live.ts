/**
 * Live status, deadlines, verdicts and sentences the app builds from data.
 * Uses {0}, {1} where the app fills in values. English|हिन्दी|ગુજરાતી.
 */
export const LIVE = `
# Templates the app fills in
{0} min ago|{0} मिनट पहले|{0} મિનિટ પહેલાં
{0} h ago|{0} घंटे पहले|{0} કલાક પહેલાં
{0} d ago|{0} दिन पहले|{0} દિવસ પહેલાં
{0} more|{0} और|{0} વધુ
In {0}|{0} में|{0}માં
{0} min late|{0} मिनट लेट|{0} મિનિટ મોડી
{0} late|{0} लेट|{0} મોડી
{0} spare between trains|ट्रेनों के बीच {0} बचा है|ટ્રેનો વચ્ચે {0} બચે છે
{0} km from Delhi Jn|दिल्ली जं. से {0} किमी|દિલ્હી જં.થી {0} કિમી
{0} of {1} e-tickets uploaded|{1} में से {0} ई-टिकट अपलोड|{1} માંથી {0} ઈ-ટિકિટ અપલોડ
{0} of {1} with a bill|{1} में से {0} के पास बिल|{1} માંથી {0} પાસે બિલ
{0} file attached|{0} फ़ाइल जुड़ी|{0} ફાઇલ જોડેલી
{0} files attached|{0} फ़ाइलें जुड़ीं|{0} ફાઇલો જોડેલી
{0} certificate|{0} प्रमाण-पत्र|{0} પ્રમાણપત્ર
{0} certificates|{0} प्रमाण-पत्र|{0} પ્રમાણપત્ર
{0} needed, {1} alerts|{0} चाहिए, {1} अलर्ट|{0} જોઈએ, {1} એલર્ટ
Next stop {0} at {1}|अगला स्टॉप {0}, {1} बजे|આગલું સ્ટેશન {0}, {1} વાગ્યે
Next stop {0} at {1}, {2}|अगला स्टॉप {0}, {1} बजे, {2}|આગલું સ્ટેશન {0}, {1} વાગ્યે, {2}
Reached {0}|{0} पहुँच गए|{0} પહોંચી ગયા
Reached {0}, {1}|{0} पहुँच गए, {1}|{0} પહોંચી ગયા, {1}
Arrived {0}|{0} पहुँच गई|{0} પહોંચી ગઈ
Chart for {0}|{0} का चार्ट|{0}નો ચાર્ટ
Coach {0} at platform {1}|कोच {0}, प्लेटफ़ॉर्म {1}|કોચ {0}, પ્લેટફોર્મ {1}
{0} km away|{0} किमी दूर|{0} કિમી દૂર
{0} min|{0} मिनट|{0} મિનિટ
{0} h|{0} घंटे|{0} કલાક
{0}d {1}h|{0}दि {1}घं|{0}દિ {1}ક
{0}h {1}m|{0}घं {1}मि|{0}ક {1}મિ
# Status and verdicts
Train yet to depart|ट्रेन अभी नहीं निकली|ટ્રેન હજી ઉપડી નથી
is yet to depart before the timetable says so|समय-सारणी से पहले निकलने वाली है|સમયપત્રક પહેલાં ઉપડવાની છે
Still waitlisted after the chart|चार्ट के बाद भी वेटलिस्ट|ચાર્ટ પછી પણ વેઇટલિસ્ટ
All confirmed|सब कन्फ़र्म|બધા કન્ફર્મ
Unreserved|अनारक्षित|અનારક્ષિત
Chart is late. Still checking every 15 minutes.|चार्ट लेट है। हर 15 मिनट में जाँच जारी।|ચાર્ટ મોડો છે. દર 15 મિનિટે તપાસ ચાલુ.
Brahmaputra has arrived.|ब्रह्मपुत्र पहुँच गई।|બ્રહ્મપુત્ર પહોંચી ગઈ.
Garib Rath chart time has passed.|गरीब रथ का चार्ट समय बीत गया।|ગરીબ રથનો ચાર્ટ સમય પૂરો થયો.
No action unless we switch to 12918.|जब तक 12918 पर न जाएँ, कुछ नहीं करना।|જ્યાં સુધી 12918 પર ન જઈએ, કંઈ કરવાનું નથી.
Brahmaputra is 3h+ late. If you booked 12918, cancel 12215 before its chart.|ब्रह्मपुत्र 3 घंटे+ लेट है। 12918 बुक किया हो तो 12215 उसके चार्ट से पहले रद्द करें।|બ્રહ્મપુત્ર 3 કલાક+ મોડી છે. 12918 બુક કર્યું હોય તો 12215 તેના ચાર્ટ પહેલાં રદ કરો.
Wait for it. A ticket only gets charted once the chart is actually out.|इंतज़ार करें। चार्ट निकलने पर ही टिकट चार्ट होता है।|રાહ જુઓ. ચાર્ટ નીકળે ત્યારે જ ટિકિટ ચાર્ટ થાય છે.
Trip complete. Settle up in Splitwise.|ट्रिप पूरी। Splitwise में हिसाब करें।|ટ્રિપ પૂરી. Splitwiseમાં હિસાબ કરો.
Hackathon is live. Build, rest in turns, ship.|हैकाथॉन शुरू है। बनाओ, बारी-बारी आराम करो, भेजो।|હેકાથોન ચાલુ છે. બનાવો, વારાફરતી આરામ કરો, સબમિટ કરો.
Free time in Guwahati starts after the finals.|गुवाहाटी में खाली समय फ़ाइनल के बाद शुरू होता है।|ગુવાહાટીમાં ફ્રી ટાઇમ ફાઇનલ પછી શરૂ થાય છે.
Trip complete. Settle up in Splitwise|ट्रिप पूरी। Splitwise में हिसाब करें|ટ્રિપ પૂરી. Splitwiseમાં હિસાબ કરો
# Deadlines and alerts
Checked automatically on 2 Nov from 04:00.|2 नवंबर से 04:00 बजे अपने आप जाँच।|2 નવેમ્બરથી 04:00 વાગ્યે આપોઆપ તપાસ.
Waiting for live running data.|लाइव रनिंग डेटा का इंतज़ार।|લાઇવ રનિંગ ડેટાની રાહ.
Overdue, was due|समय बीत गया, था|સમય પૂરો, હતું
# Long explanatory copy
Bills the team adds show up here.|टीम जो बिल जोड़ती है वे यहाँ दिखते हैं।|ટીમ જે બિલ ઉમેરે તે અહીં દેખાય.
Built an app to run the trip too.|ट्रिप चलाने के लिए ऐप भी बनाया।|ટ્રિપ ચલાવવા એપ પણ બનાવી.
Connections, deadlines and alerts|कनेक्शन, समय-सीमाएँ और अलर्ट|કનેક્શન, સમયમર્યાદા અને એલર્ટ
Delay must be a number of minutes.|देरी मिनटों की संख्या होनी चाहिए।|મોડું મિનિટની સંખ્યા હોવું જોઈએ.
The team's notes and photos show up here.|टीम के नोट्स और फ़ोटो यहाँ दिखते हैं।|ટીમની નોંધ અને ફોટો અહીં દેખાય.
Add a photo or a line about today.|आज की फ़ोटो या एक लाइन जोड़ें।|આજનો ફોટો કે એક લાઇન ઉમેરો.
No connection. Try again when you have signal.|कनेक्शन नहीं। सिग्नल आने पर फिर कोशिश करें।|કનેક્શન નથી. સિગ્નલ આવે ત્યારે ફરી પ્રયાસ કરો.
Allow pop-ups for this site to print.|प्रिंट के लिए इस साइट के पॉप-अप की अनुमति दें।|પ્રિન્ટ માટે આ સાઇટના પૉપ-અપની મંજૂરી આપો.
Couldn't make that photo small enough. Try again with less zoom.|वह फ़ोटो इतनी छोटी नहीं हो सकी। कम ज़ूम के साथ फिर कोशिश करें।|તે ફોટો પૂરતો નાનો થઈ શક્યો નહીં. ઓછા ઝૂમ સાથે ફરી પ્રયાસ કરો.
Checking how late this train has run lately...|देख रहे हैं यह ट्रेन हाल में कितनी लेट चली...|જોઈ રહ્યા છીએ આ ટ્રેન તાજેતરમાં કેટલી મોડી ચાલી...
Too tight for the metro. A cab is faster.|मेट्रो के लिए बहुत टाइट। कैब तेज़ है।|મેટ્રો માટે બહુ ટાઇટ. કેબ ઝડપી છે.
Metro is running and leaves plenty of margin.|मेट्रो चल रही है और पूरा मार्जिन बचता है।|મેટ્રો ચાલી રહી છે અને પૂરું માર્જિન બચે છે.
Show stations it runs through|दिखाएँ किन स्टेशनों से गुज़रती है|બતાવો કયા સ્ટેશનમાંથી પસાર થાય છે
Leaves from Delhi Jn itself (platform 16), so no cross-city transfer.|दिल्ली जं. से ही (प्लेटफ़ॉर्म 16) निकलती है, शहर में बदलाव नहीं।|દિલ્હી જં. પરથી જ (પ્લેટફોર્મ 16) ઉપડે છે, શહેરમાં બદલવાનું નહીં.
Notes and photos from the team|टीम के नोट्स और फ़ोटो|ટીમની નોંધ અને ફોટો
Live seats on other trains|दूसरी ट्रेनों में लाइव सीटें|બીજી ટ્રેનોમાં લાઇવ સીટ
Delay at arrival (minutes)|पहुँचते समय देरी (मिनट)|પહોંચતી વખતે મોડું (મિનિટ)
Coach order (engine first)|कोच का क्रम (इंजन पहले)|કોચનો ક્રમ (એન્જિન પહેલાં)
Engine end. Stand near your coach number on the platform board.|इंजन वाला सिरा। प्लेटफ़ॉर्म बोर्ड पर अपने कोच नंबर के पास खड़े हों।|એન્જિનની બાજુ. પ્લેટફોર્મ બોર્ડ પર તમારા કોચ નંબર પાસે ઊભા રહો.
One A4 page: every train with PNR, status and platform, deadlines, hackathon times, every phone number, and our berths.|एक A4 पेज: हर ट्रेन PNR, स्टेटस और प्लेटफ़ॉर्म के साथ, समय-सीमाएँ, हैकाथॉन समय, हर फ़ोन नंबर, और हमारी बर्थ।|એક A4 પેજ: દરેક ટ્રેન PNR, સ્ટેટસ અને પ્લેટફોર્મ સાથે, સમયમર્યાદા, હેકાથોન સમય, દરેક ફોન નંબર, અને અમારી બર્થ.
Uses the latest data on this phone. Print it the night before you leave, and again after the charts are out.|इस फ़ोन का ताज़ा डेटा इस्तेमाल करता है। निकलने से एक रात पहले प्रिंट करें, और चार्ट निकलने के बाद फिर।|આ ફોનનો તાજો ડેટા વાપરે છે. નીકળતાં પહેલાંની રાતે પ્રિન્ટ કરો, અને ચાર્ટ નીકળ્યા પછી ફરી.
Calls every train-data source with our real PNRs and trains. Takes about 10 seconds.|हमारे असली PNR और ट्रेनों के साथ हर ट्रेन-डेटा स्रोत को कॉल करता है। लगभग 10 सेकंड।|અમારા સાચા PNR અને ટ્રેનો સાથે દરેક ટ્રેન-ડેટા સ્રોતને કૉલ કરે છે. લગભગ 10 સેકન્ડ.
Train and Ticket tabs show the trains to Guwahati until 31 Oct, then only the trains home. Turn this on to list every train.|ट्रेन और टिकट टैब 31 अक्टूबर तक गुवाहाटी जाने वाली ट्रेनें दिखाते हैं, फिर सिर्फ़ घर लौटने वाली। सारी ट्रेनें देखने के लिए इसे चालू करें।|ટ્રેન અને ટિકિટ ટૅબ 31 ઑક્ટોબર સુધી ગુવાહાટી જતી ટ્રેનો બતાવે છે, પછી ફક્ત ઘરે પાછી જતી. બધી ટ્રેન જોવા માટે આ ચાલુ કરો.
Trains, times, PNRs, people, hotel, checklists: the whole plan file. Saved to GitHub; the server updates in about 2 minutes and every phone picks it up by itself.|ट्रेनें, समय, PNR, लोग, होटल, चेकलिस्ट: पूरी प्लान फ़ाइल। GitHub में सेव; सर्वर लगभग 2 मिनट में अपडेट होता है और हर फ़ोन अपने आप ले लेता है।|ટ્રેન, સમય, PNR, લોકો, હોટેલ, ચેકલિસ્ટ: આખી પ્લાન ફાઇલ. GitHubમાં સેવ; સર્વર લગભગ 2 મિનિટમાં અપડેટ થાય અને દરેક ફોન આપોઆપ લઈ લે.
Leave a box empty to use the live data (shown in grey). Filled boxes win until you clear them.|किसी बॉक्स को खाली छोड़ें तो लाइव डेटा चलेगा (धूसर में)। भरा हुआ बॉक्स तब तक चलेगा जब तक आप उसे हटाएँ नहीं।|બોક્સ ખાલી રાખો તો લાઇવ ડેટા ચાલશે (ગ્રેમાં). ભરેલું બોક્સ ત્યાં સુધી ચાલશે જ્યાં સુધી તમે તેને દૂર ન કરો.
Change only the values between quotes or the numbers. Keep commas, brackets and quotes as they are. If something breaks, Save refuses and tells you the line.|सिर्फ़ कोट्स के बीच की वैल्यू या नंबर बदलें। कॉमा, ब्रैकेट और कोट्स जैसे हैं वैसे रखें। कुछ टूटे तो Save मना कर देगा और लाइन बता देगा।|ફક્ત કૉટ્સ વચ્ચેની વૅલ્યુ કે નંબર બદલો. કોમા, બ્રૅકેટ અને કૉટ્સ જેવા છે તેવા રાખો. કંઈ તૂટે તો Save ના પાડશે અને લાઇન કહેશે.
Add a PNR, or follow a train's waitlist between two stations.|PNR जोड़ें, या दो स्टेशनों के बीच ट्रेन की वेटलिस्ट देखें।|PNR ઉમેરો, અવધા બે સ્ટેશન વચ્ચે ટ્રેનની વેઇટલિસ્ટ જુઓ.
See the waitlist on any train between two stations, without booking. Alerts when it moves to RAC or available.|बिना बुक किए दो स्टेशनों के बीच किसी भी ट्रेन की वेटलिस्ट देखें। RAC या उपलब्ध होने पर अलर्ट।|બુક કર્યા વગર બે સ્ટેશન વચ્ચે કોઈ પણ ટ્રેનની વેઇટલિસ્ટ જુઓ. RAC કે ઉપલબ્ધ થાય ત્યારે એલર્ટ.
Uses the latest data on this phone. Print it the night before you leave, and again after the charts are out.|इस फ़ोन का ताज़ा डेटा इस्तेमाल करता है। निकलने से एक रात पहले प्रिंट करें, और चार्ट निकलने के बाद फिर।|આ ફોનનો તાજો ડેટા વાપરે છે. નીકળતાં પહેલાંની રાતે પ્રિન્ટ કરો, અને ચાર્ટ નીકળ્યા પછી ફરી.
RAC means two people share one side-lower berth: sit by day, take turns lying down at night. After the train leaves, ask the TTE for any vacant berth; RAC gets upgraded first.|RAC का मतलब दो लोग एक साइड-लोअर बर्थ पर: दिन में बैठें, रात में बारी-बारी लेटें। ट्रेन निकलने के बाद TTE से खाली बर्थ माँगें; RAC को पहले अपग्रेड मिलता है।|RAC એટલે બે લોકો એક સાઇડ-લોઅર બર્થ પર: દિવસે બેસો, રાતે વારાફરતી સૂઓ. ટ્રેન ઉપડ્યા પછી TTEને ખાલી બર્થ માટે પૂછો; RACને પહેલાં અપગ્રેડ મળે છે.

# Missing bits: status labels and sentences built from data
Live data|लाइव डेटा|લાઇવ ડેટા
No alerts|कोई अलर्ट नहीं|કોઈ એલર્ટ નથી
Settle up|हिसाब करें|હિસાબ કરો
Bad upload.|अपलोड नहीं हुआ।|અપલોડ થયું નહીં.
Stop (flag)|रोकें (फ़्लैग)|થોભાવો (ફ્લેગ)
Follow along|साथ चलें|સાથે જુઓ
Guwahati Run|गुवाहाटी रन|ગુવાહાટી રન
leave IIT by|IIT से निकलें|IIT થી નીકળો
rest at IITG|IITG में आराम|IITGમાં આરામ
Chart checker|चार्ट चेकर|ચાર્ટ ચેકર
Chart prepared|चार्ट बन गया|ચાર્ટ થઈ ગયો
sharing location|लोकेशन शेयर हो रही है|લોકેશન શેર થઈ રહ્યું છે
Live train status|लाइव ट्रेन स्टेटस|લાઇવ ટ્રેન સ્ટેટસ
No ticket with that id|उस ID का कोई टिकट नहीं|તે IDની કોઈ ટિકિટ નથી
Open phone settings|फ़ोन सेटिंग्स खोलें|ફોન સેટિંગ્સ ખોલો
At Ghaziabad|गाज़ियाबाद में|ગાઝિયાબાદ ખાતે
Wed, 28 Oct|बुध, 28 अक्टूबर|બુધ, 28 ઑક્ટોબર
Moments we'll remember:|जो पल याद रहेंगे:|જે પળો યાદ રહેશે:
What the journey looked like:|सफ़र कैसा रहा:|પ્રવાસ કેવો રહ્યો:
in association with IIT Guwahati|IIT गुवाहाटी के सहयोग से|IIT ગુવાહાટીના સહયોગથી
Department of Information Technology|सूचना प्रौद्योगिकी विभाग|માહિતી ટેકનોલોજી વિભાગ
The Head of Department, Department of Information Technology, BVM|विभागाध्यक्ष, सूचना प्रौद्योगिकी विभाग, BVM|વિભાગાધ્યક્ષ, માહિતી ટેકનોલોજી વિભાગ, BVM
Birla Vishvakarma Mahavidyalaya (BVM), Vallabh Vidyanagar|बिरला विश्वकर्मा महाविद्यालय (BVM), वल्लभ विद्यानगर|બિરલા વિશ્વકર્મા મહાવિદ્યાલય (BVM), વલ્લભ વિદ્યાનગર
Its fare comes off Money, the grant and the report.|इसका किराया पैसा, ग्रांट और रिपोर्ट से हट जाता है।|તેનું ભાડું પૈસા, ગ્રાન્ટ અને રિપોર્ટમાંથી નીકળી જાય છે.
Spelled SENJALIYA on this ticket. Carry an original photo ID.|इस टिकट पर SENJALIYA लिखा है। मूल फ़ोटो ID साथ रखें।|આ ટિકિટ પર SENJALIYA લખ્યું છે. મૂળ ફોટો ID સાથે રાખો.
Om Senjalia: name is SENJALIYA on the Avadh Assam Exp ticket. Carry an original photo ID.|ओम सेनजलिया: अवध असम एक्स. टिकट पर नाम SENJALIYA है। मूल फ़ोटो ID साथ रखें।|ઓમ સેનજલિયા: અવધ અસમ એક્સ. ટિકિટ પર નામ SENJALIYA છે. મૂળ ફોટો ID સાથે રાખો.
Thanks to BVM and the SSIP cell for backing student innovators.|छात्र नवाचारकों को साथ देने के लिए BVM और SSIP सेल का धन्यवाद।|વિદ્યાર્થી નવોદ્યમીઓને ટેકો આપવા BVM અને SSIP સેલનો આભાર.
Shows up here once the PNR check returns it, usually by chart time.|PNR जाँच में आते ही यहाँ दिखता है, आमतौर पर चार्ट के समय तक।|PNR તપાસમાં આવતાં જ અહીં દેખાય, સામાન્ય રીતે ચાર્ટના સમય સુધીમાં.
BVM SSIP 2.0: Student Innovation Event Participation Expenses Reimbursement|BVM SSIP 2.0: छात्र नवाचार इवेंट भागीदारी खर्च प्रतिपूर्ति|BVM SSIP 2.0: વિદ્યાર્થી નવોદ્યમ ઇવેન્ટ ભાગીદારી ખર્ચ પ્રતિપૂર્તિ
Saved to GitHub. The server updates in about 2 minutes, then every phone picks up the new plan on its next refresh.|GitHub में सेव। सर्वर लगभग 2 मिनट में अपडेट होगा, फिर हर फ़ोन अगली रीफ़्रेश पर नया प्लान ले लेगा।|GitHubમાં સેવ. સર્વર લગભગ 2 મિનિટમાં અપડેટ થશે, પછી દરેક ફોન આગલી રિફ્રેશ પર નવો પ્લાન લઈ લેશે.
We also built a small app to run the trip itself: live PNR and train tracking, connection alerts, and a grant claim calculator for our college's SSIP support.|हमने ट्रिप चलाने के लिए छोटा ऐप भी बनाया: लाइव PNR और ट्रेन ट्रैकिंग, कनेक्शन अलर्ट, और कॉलेज के SSIP सहयोग के लिए ग्रांट कैलकुलेटर।|અમે ટ્રિપ ચલાવવા નાની એપ પણ બનાવી: લાઇવ PNR અને ટ્રેન ટ્રેકિંગ, કનેક્શન એલર્ટ, અને કૉલેજના SSIP સહયોગ માટે ગ્રાન્ટ કેલ્ક્યુલેટર.
We reach IIT from Kamakhya around 01:50, so the hostel night and dinner on 30 Oct are spent on the train. Hostel and meals are included in our fee (team Visonaris, WC4U2026-18): carry the fee receipt and ask at the desk for a room.|कामाख्या से IIT हम लगभग 01:50 पर पहुँचते हैं, इसलिए 30 अक्टूबर की हॉस्टल रात और डिनर ट्रेन में बीतते हैं। हॉस्टल और खाना हमारी फ़ीस में शामिल है (टीम Visonaris, WC4U2026-18): फ़ीस की रसीद साथ रखें और डेस्क पर कमरा माँगें।|કામાખ્યાથી IIT અમે લગભગ 01:50 વાગ્યે પહોંચીએ છીએ, એટલે 30 ઑક્ટોબરની હોસ્ટેલ રાત અને ડિનર ટ્રેનમાં જાય છે. હોસ્ટેલ અને ભોજન અમારી ફીમાં સામેલ છે (ટીમ Visonaris, WC4U2026-18): ફીની રસીદ સાથે રાખો અને ડેસ્ક પર રૂમ માંગો.
Couldn't find a free file name.|खाली फ़ाइल नाम नहीं मिला।|ખાલી ફાઇલ નામ મળ્યું નહીં.
No change since tracking started.|ट्रैकिंग शुरू होने से कोई बदलाव नहीं।|ટ્રેકિંગ શરૂ થયા પછી કોઈ ફેરફાર નહીં.

# Sentences built with values (the app fills {0}, {1})
{0}'s trip|{0} की ट्रिप|{0}ની ટ્રિપ
Hi {0}|हाय {0}|હાય {0}
Parent sign-in|पैरेंट साइन-इन|વાલી સાઇન-ઇન
Following {0}. Enter the parent passcode.|{0} को फ़ॉलो कर रहे हैं। पैरेंट पासकोड डालें।|{0}ને ફોલો કરી રહ્યા છો. વાલી પાસકોડ દાખલ કરો.
Choose your language|अपनी भाषा चुनें|તમારી ભાષા પસંદ કરો
Everything in the app will be in this language. You can change it later in Settings.|ऐप में सब कुछ इसी भाषा में होगा। इसे बाद में सेटिंग्स में बदल सकते हैं।|એપમાં બધું આ જ ભાષામાં હશે. તેને પછી સેટિંગ્સમાં બદલી શકો.
Everything in the app, in the language you pick. Applies on this phone.|ऐप का सब कुछ, आपकी चुनी भाषा में। इस फ़ोन पर लागू।|એપનું બધું, તમે પસંદ કરેલી ભાષામાં. આ ફોન પર લાગુ.
Near {0}|{0} के पास|{0} નજીક
, near {0}|, {0} के पास|, {0} નજીક
{0} km from {1}|{1} से {0} किमी|{1}થી {0} કિમી
{0} each|हर एक {0}|દરેક {0}
Open {0}|{0} खोलें|{0} ખોલો
Delete {0}|{0} हटाएँ|{0} કાઢી નાખો
Delete {0}?|{0} हटाएँ?|{0} કાઢી નાખવું?
Delete "{0}"?|"{0}" हटाएँ?|"{0}" કાઢી નાખવું?
Add a {0}|{0} जोड़ें|{0} ઉમેરો
Platform {0}|प्लेटफ़ॉर्म {0}|પ્લેટફોર્મ {0}
{0} min early|{0} मिनट जल्दी|{0} મિનિટ વહેલી
{0}h {1}m late|{0}घं {1}मि लेट|{0}ક {1}મિ મોડી
delayed by {0} min|{0} मिनट देरी|{0} મિનિટ મોડું
Last sent {0}|आख़िरी बार भेजा {0}|છેલ્લે મોકલ્યું {0}
Location shared {0}|लोकेशन शेयर {0}|લોકેશન શેર {0}
Live · updated {0}|लाइव · अपडेट {0}|લાઇવ · અપડેટ {0}
Weather · {0}|मौसम · {0}|હવામાન · {0}
{0}% rain|{0}% बारिश|{0}% વરસાદ
{0} of 4 here|4 में से {0} यहाँ|4 માંથી {0} અહીં
{0}'s packing|{0} की पैकिंग|{0}ની પૅકિંગ
{0}'s status|{0} की स्थिति|{0}ની સ્થિતિ
Checked {0}|जाँचा {0}|તપાસ્યું {0}
Checked {0}{1}|जाँचा {0}{1}|તપાસ્યું {0}{1}
Bay {0} in {1}|{1} में बे {0}|{1}માં બે {0}
Own phone · {0}|अपना फ़ोन · {0}|પોતાનો ફોન · {0}
From {0} to {1}|{0} से {1} तक|{0} થી {1} સુધી
Day {0}, {1} {2}|दिन {0}, {1} {2}|દિવસ {0}, {1} {2}
. Change at {0}.|. {0} पर बदलें।|. {0} પર બદલો.
Override for {0}|{0} के लिए ओवरराइड|{0} માટે ઓવરરાઇડ
Order before {0}|{0} से पहले ऑर्डर करें|{0} પહેલાં ઓર્ડર કરો
Resting now: {0}|अभी आराम: {0}|હમણાં આરામ: {0}
Your next rest: {0} to {1}|आपका अगला आराम: {0} से {1}|તમારો આગલો આરામ: {0} થી {1}
Your turn to sleep. Up at {0}.|आपकी बारी सोने की। {0} पर उठना।|તમારી વારી સૂવાની. {0} વાગ્યે ઊઠવાનું.
First rest {0} {1}: {2}|पहला आराम {0} {1}: {2}|પહેલો આરામ {0} {1}: {2}
On the way to {0}|{0} की ओर|{0} તરફ
Train tickets · {0}|ट्रेन टिकट · {0}|ટ્રેન ટિકિટ · {0}
Other trains on {0}|{0} की दूसरी ट्रेनें|{0}ની બીજી ટ્રેનો
Receipts for the report · {0}/{1}|रिपोर्ट की रसीदें · {0}/{1}|રિપોર્ટની રસીદો · {0}/{1}
Documents for the claim · {0}/{1}|दावे के दस्तावेज़ · {0}/{1}|દાવાના દસ્તાવેજ · {0}/{1}
Getting off at {0}: {1}|{0} पर उतरना: {1}|{0} પર ઊતરવું: {1}
Waitlist moved from {0} to {1}|वेटलिस्ट {0} से {1} हुई|વેઇટલિસ્ટ {0} થી {1} થઈ
With {0}, {1} (their phone)|{0} के साथ, {1} (उनका फ़ोन)|{0} સાથે, {1} (તેમનો ફોન)
Location off · with {0} ({1})|लोकेशन बंद · {0} के साथ ({1})|લોકેશન બંધ · {0} સાથે ({1})
Photo by {0}|फ़ोटो {0} की|ફોટો {0}નો
{0} railway station|{0} रेलवे स्टेशन|{0} રેલવે સ્ટેશન
Fetching the latest run of {0}...|{0} की ताज़ा रन ला रहे हैं...|{0}ની તાજી રન લાવી રહ્યા છીએ...
The ticket site didn't answer: {0}|टिकट साइट ने जवाब नहीं दिया: {0}|ટિકિટ સાઇટે જવાબ આપ્યો નહીં: {0}
Your seat: coach {0}, berth {1} ({2})|आपकी सीट: कोच {0}, बर्थ {1} ({2})|તમારી સીટ: કોચ {0}, બર્થ {1} ({2})
The ticket is booked to {0}; we get off at {1}.|टिकट {0} तक है; हम {1} पर उतरेंगे।|ટિકિટ {0} સુધી છે; અમે {1} પર ઊતરીશું.
Capped at the {0} limit. Eligible costs are {1}.|{0} सीमा पर सीमित। पात्र खर्च {1}।|{0} મર્યાદા પર મર્યાદિત. પાત્ર ખર્ચ {1}.
Under the {0} limit by {1}.|{0} सीमा से {1} कम।|{0} મર્યાદાથી {1} ઓછું.
Reaches {0} ({1}) at {2}, {3}{4}|{0} ({1}) पहुँचती है {2} बजे, {3}{4}|{0} ({1}) પહોંચે છે {2} વાગ્યે, {3}{4}
Leaves {0} ({1}) at {2}{3}|{0} ({1}) से निकलती है {2}{3}|{0} ({1}) થી ઉપડે છે {2}{3}
On {0} {1} ({2} to {3}{4})|{0} {1} को ({2} से {3}{4})|{0} {1} ના રોજ ({2} થી {3}{4})
{0} {1} to {2}. These times move with the train's real arrival.|{0} {1} से {2}। ये समय ट्रेन के असली आगमन के साथ बदलते हैं।|{0} {1} થી {2}. આ સમય ટ્રેનના સાચા આગમન સાથે બદલાય છે.
{0} bill{1} attached. Add another (e.g. the payment screenshot):|{0} बिल{1} जुड़ा। और जोड़ें (जैसे पेमेंट स्क्रीनशॉट):|{0} બિલ{1} જોડેલું. વધુ ઉમેરો (જેમ કે પેમેન્ટ સ્ક્રીનશોટ):
The latest real run of {0} {1}, which left its origin on {2}. Not our trip: nothing is saved.|{0} {1} की ताज़ा असली रन, जो {2} को शुरू हुई। हमारी ट्रिप नहीं: कुछ सेव नहीं होता।|{0} {1}ની તાજી સાચી રન, જે {2}ના રોજ શરૂ થઈ. અમારી ટ્રિપ નહીં: કંઈ સેવ થતું નથી.
Timetable. Live tracking starts 3 hours before departure ({0} on {1}).|टाइमटेबल। लाइव ट्रैकिंग निकलने से 3 घंटे पहले शुरू होती है ({1} को {0})।|ટાઇમટેબલ. લાઇવ ટ્રેકિંગ ઉપડવાના 3 કલાક પહેલાં શરૂ થાય છે ({1}ના રોજ {0}).
Live running status{0}.|लाइव रनिंग स्टेटस{0}.|લાઇવ રનિંગ સ્ટેટસ{0}.
(running late, was {0})|(लेट चल रही है, थी {0})|(મોડી ચાલી રહી છે, હતી {0})
Likely {0}|संभवतः {0}|સંભવતઃ {0}
Removes it{0} for everyone.|इसे हर किसी के लिए हटा देता है।{0}|તેને દરેક માટે કાઢી નાખે છે.{0}
It's removed from GitHub for everyone.{0}|GitHub से सबके लिए हट गया।{0}|GitHub પરથી બધા માટે કાઢી નાખ્યું.{0}
Upload failed: {0}|अपलोड नहीं हुआ: {0}|અપલોડ થયું નહીં: {0}
Photo upload failed: {0}|फ़ोटो अपलोड नहीं हुई: {0}|ફોટો અપલોડ થયો નહીં: {0}
Sign-in failed ({0})|साइन-इन नहीं हुआ ({0})|સાઇન-ઇન થયું નહીં ({0})
Offline copy from {0}|{0} से ऑफ़लाइन कॉपी|{0} થી ઓફલાઇન કૉપી
Last check failed: {0}|आख़िरी जाँच नहीं हुई: {0}|છેલ્લી તપાસ થઈ નહીં: {0}
{0} · last run {1}|{0} · आख़िरी रन {1}|{0} · છેલ્લી રન {1}
{0} · coach {1} from the engine|{0} · इंजन से {1} कोच|{0} · એન્જિનથી {1} કોચ
· coach {0} from the engine|· इंजन से {0} कोच|· એન્જિનથી {0} કોચ
{0} of {1}|{1} में से {0}|{1} માંથી {0}
Anand to IIT Guwahati and back · {0} to {1}|आनंद से IIT गुवाहाटी और वापस · {0} से {1}|આનંદ થી IIT ગુવાહાટી અને પાછા · {0} થી {1}
A fully waitlisted e-ticket is cancelled and refunded automatically. Pick another train from Plan B.|पूरी तरह वेटलिस्ट ई-टिकट अपने आप रद्द होकर पैसे लौट जाते हैं। प्लान बी से दूसरी ट्रेन चुनें।|સંપૂર્ણ વેઇટલિસ્ટ ઈ-ટિકિટ આપોઆપ રદ થઈને પૈસા પાછા આવે છે. પ્લાન બીમાંથી બીજી ટ્રેન પસંદ કરો.
Still waitlisted after the chart: the ticket auto-cancels and refunds. Pick another train from Plan B.|चार्ट के बाद भी वेटलिस्ट: टिकट अपने आप रद्द होकर पैसे लौट जाते हैं। प्लान बी से दूसरी ट्रेन चुनें।|ચાર્ટ પછી પણ વેઇટલિસ્ટ: ટિકિટ આપોઆપ રદ થઈને પૈસા પાછા આવે છે. પ્લાન બીમાંથી બીજી ટ્રેન પસંદ કરો.
`;
