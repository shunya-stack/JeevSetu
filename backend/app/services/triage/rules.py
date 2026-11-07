"""
Veterinary Triage Rule Definitions
Rule Version: demo-v1.0
IMPORTANT CLINICAL BOUNDARY:
These rules determine operational intake urgency for human veterinary triage.
They do not diagnose diseases, recommend medications, or calculate dosages.
"""

URGENT_RED_FLAGS = [
    {
        "id": "COLLAPSE_RECUMBENCY",
        "keywords": ["cannot stand", "unable to get up", "downer", "collapsed", "ପଡ଼ିଯାଇଛି", "ଉଠିପାରୁନି", "गिरा हुआ", "उठ नहीं पा रहा", "लेट गया"],
        "reason": "Animal is recumbent / unable to stand. Risk of rapid metabolic or physical deterioration.",
        "action": "Urgent veterinary dispatch or local field vet visit recommended immediately. Keep animal sheltered and dry."
    },
    {
        "id": "ACUTE_BLOAT",
        "keywords": ["bloat", "swollen belly", "swollen stomach", "distended left flank", "ପେଟ ଫୁଲିଛି", "ବାମ ପେଟ ଫୁଲା", "पेट फूल गया", "अफरा", "पेट में गैस"],
        "reason": "Suspected acute rumen tympany (bloat). Pressure on diaphragm may cause respiratory failure.",
        "action": "Immediate veterinary attention required. Keep animal standing with head elevated; do not force feed or drench fluids."
    },
    {
        "id": "HEAVY_BLEEDING_TRAUMA",
        "keywords": ["bleeding heavily", "deep wound", "fracture", "bone visible", "ରକ୍ତ ବହୁଛି", "ଗଭୀର କ୍ଷତ", "खून बह रहा", "हड्डी टूटी", "गहरा घाव"],
        "reason": "Uncontrolled hemorrhage or traumatic injury requiring immediate physical stabilization.",
        "action": "Apply clean cloth pressure if safe. Keep animal calm and await emergency veterinary assistance."
    },
    {
        "id": "RESPIRATORY_DISTRESS",
        "keywords": ["gasping", "heavy breathing", "panting severely", "tongue out breathing", "ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ", "ନାକରୁ ଘଡ଼ଘଡ଼ ଶବ୍ଦ", "सांस लेने में भारी तकलीफ", "हांफ रहा है"],
        "reason": "Severe respiratory distress. May indicate acute pneumonia, heat stroke, or choking.",
        "action": "Move animal to cool shaded area. Ensure unobstructed airway. Immediate veterinary intervention needed."
    },
    {
        "id": "HIGH_FEVER_SHIVERING",
        "keywords": ["burning hot", "very high fever", "shivering constantly", "ଅତ୍ୟଧିକ ଜ୍ୱର", "ଥରୁଛି", "ଖୁବ୍ ତାତିଛି", "बहुत तेज बुखार", "कांप रहा है"],
        "reason": "High febrile state with systemic rigors. Possible acute infectious or tick-borne disease.",
        "action": "Keep in shade. Cold water sponge on forehead. Contact veterinary officer for evaluation."
    },
    {
        "id": "PROLONGED_ANOREXIA",
        "keywords": ["no food for 3 days", "not eating since 3 days", "not drinking water", "ତିନି ଦିନ ହେଲା ଖାଉନି", "ପାଣି ପିଉନି", "तीन दिन से खाना बंद", "पानी नहीं पी रहा"],
        "reason": "Severe dehydration and rumen stasis due to prolonged aphagia/adipsia.",
        "action": "Veterinary fluid therapy and clinical assessment required urgently."
    }
]

ROUTINE_REVIEW_FLAGS = [
    {
        "id": "MILD_ANOREXIA",
        "keywords": ["not eating well", "reduced appetite", "eating less", "କମ୍ ଖାଉଛି", "ଖାଇବା କମାଇଦେଇଛି", "कम खा रहा", "भूख कम"],
        "reason": "Decreased appetite reported.",
        "action": "Monitor body temperature and rumination. Schedule veterinary review within 24 hours."
    },
    {
        "id": "MILK_DROP",
        "keywords": ["milk dropped", "less milk", "no milk", "କ୍ଷୀର କମିଯାଇଛି", "କ୍ଷୀର ହେଉନି", "दूध कम हो गया", "दूध घट गया"],
        "reason": "Sudden or significant drop in milk yield.",
        "action": "Check udder for heat, hardness, or swelling (mastitis check). Consult veterinary doctor."
    },
    {
        "id": "LAMENESS",
        "keywords": ["limping", "leg injury", "swollen hoof", "ଛୋଟଉଛି", "ଗୋଡ଼ ଫୁଲା", "ଲଙ୍ଗଡ଼ାଉଛି", "लंगड़ा रहा", "खुर में दर्द"],
        "reason": "Locomotor issue or hoof affection.",
        "action": "Examine hoof for stones or lesions. Restrict movement and arrange veterinary visit."
    },
    {
        "id": "DIARRHEA_OR_CONSTIPATION",
        "keywords": ["loose motion", "watery dung", "constipation", "ଝାଡ଼ା ହେଉଛି", "ପତଳା ଝାଡ଼ା", "ଦାନ୍ତ କାମୁଡୁଛି", "दस्त", "पतला गोबर"],
        "reason": "Gastrointestinal disturbance reported.",
        "action": "Ensure clean drinking water with salt/electrolyte. Veterinary stool examination advised."
    },
    {
        "id": "EYE_NASAL_DISCHARGE",
        "keywords": ["eye watering", "nasal discharge", "salivating", "ଆଖିରୁ ପାଣି", "ନାକରୁ ପାଣି", "ଲାଳ ଗଡୁଛି", "आंख से पानी", "नाक बहना", "लार गिरना"],
        "reason": "Mucosal discharge or hypersalivation observed.",
        "action": "Isolate from herd if infectious symptoms suspect. Seek veterinary guidance."
    }
]

