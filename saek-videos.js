// ΕΚΑΒ Σπουδή: κοινή καταχώριση εκπαιδευτικών βίντεο για ΟΛΑ τα μαθήματα ΣΑΕΚ.
// Για νέο βίντεο: πρόσθεσε στο EKAB_COURSE_VIDEO_SERIES το σωστό courseId (01–20),
// με chapter που αντιστοιχεί σε υπαρκτό id="lesson-N" στη γραπτή θεωρία του μαθήματος.
// Οι τίτλοι στην οριζόντια λίστα δημιουργούνται ΑΥΤΟΜΑΤΑ ως σύνδεσμοι προς τη
// γραπτή θεωρία του ίδιου κεφαλαίου. Τα Prev/Next και το σύρσιμο αλλάζουν βίντεο.
// Ο κοινός renderer φορτώνεται και στα 20 μαθήματα μέσω updates.js·
// δεν χρειάζεται να αλλάξεις ξεχωριστά την HTML όταν προστίθεται νέο βίντεο.
// Συμπλήρωσε ΕΠΑΛΗΘΕΥΜΕΝΟ σύνδεσμο για δημοσίευση, π.χ. "01-1": "https://www.youtube.com/watch?v=...".
// Κλειδιά: "01-1" = Ανατομία κεφάλαιο 1, "05-11" = Προνοσοκομειακή εκτίμηση κεφάλαιο 11.
// Επιτρεπόμενα YouTube/watch, youtu.be, Vimeo και http(s) σύνδεσμοι πηγών. Δεν φιλοξενεί βίντεο.
window.EKAB_LESSON_VIDEOS = {
  "01-1": "https://scrimba.com/explain/guide03gpa2uj7?claim=ki9ctoi3usaqlrrj" // Ανατομία: Ανατομική θέση και προσανατολισμός
};

// Κάθε μάθημα εμφανίζεται ως μία συνεχής οριζόντια σειρά τμημάτων (χωρίς κενές καρτέλες).
// Πρόσθεσε μελλοντικά νέα ελεγμένα μέρη εδώ· όχι βίντεο από διαφορετικό μάθημα.
window.EKAB_COURSE_VIDEO_SERIES = {
  "01": {
    "title": "Ανατομία",
    "totalChapters": 14,
    "parts": [
      {
        "chapter": 1,
        "title": "Ανατομική θέση και προσανατολισμός",
        "shortTitle": "Ανατομική θέση",
        "url": "https://scrimba.com/explain/guide03gpa2uj7?claim=ki9ctoi3usaqlrrj"
      },
      {
        "chapter": 2,
        "title": "Οστά του κορμού και των άκρων",
        "shortTitle": "Οστά κορμού και άκρων",
        "url": "https://scrimba.com/explain/guide00mid43ee?claim=rsjlvf8je7sj16p3"
      },
      {
        "chapter": 3,
        "title": "Θώρακας και αναπνευστικό σύστημα",
        "shortTitle": "Θώρακας και αναπνοή",
        "url": "https://scrimba.com/explain/guide0qcfv2796?claim=358r41su64k1knr2"
      },
      {
        "chapter": 4,
        "title": "Κοιλιακά όργανα",
        "shortTitle": "Κοιλιακά όργανα",
        "url": "https://scrimba.com/explain/guide0ffu06oih?claim=2791kcsac9vvo3b8"
      },
      {
        "chapter": 5,
        "title": "Νευρικό και κυκλοφορικό σύστημα",
        "shortTitle": "Νεύρα και κυκλοφορία",
        "url": "https://scrimba.com/explain/guide05liq68cc?claim=i886sq25u2vvo4ng"
      },
      {
        "chapter": 6,
        "title": "Κύτταρο, ιστοί και όργανα",
        "shortTitle": "Κύτταρο και ιστοί",
        "url": "https://scrimba.com/explain/guide04cimp8a0?claim=85g1u695eje0ijju"
      },
      {
        "chapter": 7,
        "title": "Σπονδυλική στήλη και νωτιαίος μυελός",
        "shortTitle": "Σπονδυλική στήλη",
        "url": "https://scrimba.com/explain/guide0hptegonu?claim=1adcvdto0h52conf"
      },
      {
        "chapter": 8,
        "title": "Κρανίο, εγκέφαλος και μήνιγγες",
        "shortTitle": "Κρανίο και μήνιγγες",
        "url": "https://scrimba.com/explain/guide0b3ubdkbn?claim=l1iserqpcm125r3h"
      },
      {
        "chapter": 9,
        "title": "Αρθρώσεις, σύνδεσμοι και μύες",
        "shortTitle": "Αρθρώσεις και μύες",
        "url": "https://scrimba.com/explain/guide057ta7j1i?claim=t0nm6p25k78bpoj5"
      },
      {
        "chapter": 10,
        "title": "Καρδιά, μεγάλα αγγεία και βαλβίδες",
        "shortTitle": "Καρδιά και βαλβίδες",
        "url": "https://scrimba.com/explain/guide0all9p5vj?claim=6a6h51m1nfcdj61p"
      },
      {
        "chapter": 11,
        "title": "Ανώτεροι και κατώτεροι αεραγωγοί",
        "shortTitle": "Αεραγωγοί",
        "url": "https://scrimba.com/explain/guide0hh4rv0g2?claim=t8s6lesv6kkujbn7"
      },
      {
        "chapter": 12,
        "title": "Πεπτικό σύστημα και αδένες",
        "shortTitle": "Πεπτικό σύστημα",
        "url": "https://scrimba.com/explain/guide0ru3v4eak?claim=e61qnhgb249dnloo"
      },
      {
        "chapter": 13,
        "title": "Ουροποιητικό και αναπαραγωγικό σύστημα",
        "shortTitle": "Ουροποιητικό και αναπαραγωγή",
        "url": "https://scrimba.com/explain/guide0t0ocsi8v?claim=71hqna7vcupo9m43"
      },
      {
        "chapter": 14,
        "title": "Ανατομικοί χώροι και τεταρτημόρια κοιλιάς",
        "shortTitle": "Κοιλιακές περιοχές",
        "url": "https://scrimba.com/explain/guide087ue7a2n?claim=m71suiap4jsbaavo"
      }
    ]
  },
  "02": {
    "title": "Φυσιολογία",
    "totalChapters": 13,
    "parts": [
      {
        "chapter": 1,
        "title": "Ομοιόσταση και ανατροφοδότηση",
        "shortTitle": "Ομοιόσταση",
        "url": "https://scrimba.com/explain/guide0r438lqaq?claim=aeo28psaqec6dpof"
      },
      {
        "chapter": 2,
        "title": "Φυσιολογία της αναπνοής",
        "shortTitle": "Αναπνοή",
        "url": "https://scrimba.com/explain/guide0b5vssoo8?claim=pi3dmagrirkm0n3m"
      },
      {
        "chapter": 3,
        "title": "Κυκλοφορία και αιμάτωση",
        "shortTitle": "Αιμάτωση",
        "url": "https://scrimba.com/explain/guide09etisai5?claim=1m2hhufeba8pvom7"
      },
      {
        "chapter": 4,
        "title": "Νευρική ρύθμιση και μεταβολισμός",
        "shortTitle": "Νευρική ρύθμιση",
        "url": "https://scrimba.com/explain/guide018obtotq?claim=l5ksr6tgo7hbag0h"
      },
      {
        "chapter": 5,
        "title": "Μεμβράνες και μεταφορά ουσιών",
        "shortTitle": "Μεμβράνες",
        "url": "https://scrimba.com/explain/guide0t1v8jfkm?claim=ithvlkgk4vfsuno1"
      },
      {
        "chapter": 6,
        "title": "Νευρική ώση και αντανακλαστικά",
        "shortTitle": "Νευρική ώση",
        "url": "https://scrimba.com/explain/guide0h066tsns?claim=n9mq4gv3e9u6clng"
      },
      {
        "chapter": 7,
        "title": "Καρδιακός κύκλος και ηλεκτρική αγωγή",
        "shortTitle": "Καρδιακός κύκλος",
        "url": "https://scrimba.com/explain/guide084olnbg2?claim=cn7jjjifilv0atc7"
      },
      {
        "chapter": 8,
        "title": "Πίεση, αντίσταση και μικροκυκλοφορία",
        "shortTitle": "Πίεση και μικροκυκλοφορία",
        "url": "https://scrimba.com/explain/guide06kl86o7o?claim=5k81uvmogqdk0lck"
      },
      {
        "chapter": 9,
        "title": "Αερισμός, διάχυση και μεταφορά αερίων",
        "shortTitle": "Μεταφορά αερίων",
        "url": "https://scrimba.com/explain/guide05h54ooni?claim=rfcgc2671r40760s"
      },
      {
        "chapter": 10,
        "title": "Οξεοβασική ισορροπία",
        "shortTitle": "Οξεοβασική ισορροπία",
        "url": "https://scrimba.com/explain/guide0dard3kag?claim=msnln9isgtr0f1d5"
      },
      {
        "chapter": 11,
        "title": "Νεφρική λειτουργία και ισοζύγιο υγρών",
        "shortTitle": "Νεφρική λειτουργία",
        "url": "https://scrimba.com/explain/guide0jq6sl7dg?claim=339afagmi43jqi8p"
      },
      {
        "chapter": 12,
        "title": "Πέψη, απορρόφηση και θρέψη",
        "shortTitle": "Πέψη και απορρόφηση",
        "url": "https://scrimba.com/explain/guide0lh0kciva?claim=ikeqbaamd03or4i0"
      },
      {
        "chapter": 13,
        "title": "Ενδοκρινής ρύθμιση και γλυκόζη",
        "shortTitle": "Ενδοκρινής ρύθμιση",
        "url": "https://scrimba.com/explain/guide05n7d1euh?claim=p8sc8065t01kgbf9"
      }
    ]
  },
  "03": {
    "title": "Ο Διασώστης – Επαγγελματίας Υγείας",
    "totalChapters": 10,
    "parts": [
      {
        "chapter": 1,
        "title": "Αποστολή και επαγγελματικά όρια",
        "shortTitle": "Επαγγελματικά όρια",
        "url": "https://scrimba.com/explain/guide0a7i58umh?claim=bgi4urgms2pt6p7d"
      },
      {
        "chapter": 2,
        "title": "Επικοινωνία, αξιοπρέπεια και εμπιστευτικότητα",
        "shortTitle": "Επικοινωνία",
        "url": "https://scrimba.com/explain/guide0j53sq7b5?claim=mivtpce2c7hd844o"
      },
      {
        "chapter": 3,
        "title": "Ασφάλεια πληρώματος και συνεχής εκπαίδευση",
        "shortTitle": "Ασφάλεια πληρώματος",
        "url": "https://scrimba.com/explain/guide0el382jup?claim=hbs399por5j7sq2m"
      }
    ]
  }
};
