// Nepal Administrative Divisions Data
// Provinces, Districts, and Municipalities

export interface District {
  name: string;
  municipalities: string[];
}

export interface Province {
  name: string;
  districts: District[];
}

export const nepalProvinces: Province[] = [
  {
    name: 'Koshi',
    districts: [
      {
        name: 'Bhojpur',
        municipalities: ['Bhojpur', 'Shadananda', 'Hatuwagadhi', 'Pauwadungma', 'Aamchowk', 'Ramprasad Rai', 'Temkemaiyung', 'Arun'],
      },
      {
        name: 'Dhankuta',
        municipalities: ['Dhankuta', 'Pakhribas', 'Sangurigadhi', 'Chhathar Jorpati', 'Chaubise', 'Shahidbhumi', 'Chhathar', 'Mahalaxmi'],
      },
      {
        name: 'Ilam',
        municipalities: ['Ilam', 'Deumai', 'Mai', 'Suryodaya', 'Phakphokthum', 'Mangsebung', 'Chulachuli', 'Rong', 'Sandakpur'],
      },
      {
        name: 'Jhapa',
        municipalities: ['Bhadrapur', 'Damak', 'Kankai', 'Birtamod', 'Gauradaha', 'Kamal', 'Buddhashanti', 'Haldibari', 'Kachankawal', 'Mechinagar', 'Shivasataxi', 'Arjundhara', 'Gaurigunj', 'Jhapa'],
      },
      {
        name: 'Khotang',
        municipalities: ['Diktel', 'Halesi Tuwachung', 'Khotehang', 'Diprung', 'Aiselukharka', 'Jantedhunga', 'Kepilasgadhi', 'Barahapokhari', 'Rawabesi', 'Sakela'],
      },
      {
        name: 'Morang',
        municipalities: ['Biratnagar', 'Sundarharaicha', 'Belbari', 'Pathari-Sanischare', 'Rangeli', 'Ratuwamai', 'Urlabari', 'Kanepokhari', 'Budhiganga', 'Gramthan', 'Jahada', 'Katahari', 'Kerabari', 'Miklajung', 'Patahrishishpur', 'Sunbarshi'],
      },
      {
        name: 'Okhaldhunga',
        municipalities: ['Siddhicharan', 'Champadevi', 'Chisankhugadhi', 'Khijidemba', 'Likhu', 'Manebhanjyang', 'Molung', 'Sunkoshi'],
      },
      {
        name: 'Panchthar',
        municipalities: ['Phidim', 'Hilihang', 'Kummayak', 'Miklajung', 'Phalelung', 'Phalgunanda', 'Tumbewa', 'Yangwarak'],
      },
      {
        name: 'Sankhuwasabha',
        municipalities: ['Khandbari', 'Chainpur', 'Chichila', 'Dharmadevi', 'Khadbari', 'Madi', 'Makalu', 'Sabhaya', 'Silichong'],
      },
      {
        name: 'Solukhumbu',
        municipalities: ['Salleri', 'Dudhkoshi', 'Dudhkunda', 'Khumbupasanglahmu', 'Likhupike', 'Mahakulung', 'Nechasalyan', 'Sotang', 'Thulung Dudhkoshi'],
      },
      {
        name: 'Sunsari',
        municipalities: ['Inaruwa', 'Duhabi', 'Gadhi', 'Barah', 'Bhokraha Narsingh', 'Dewanganj', 'Haripur', 'Koshi', 'Ramdhuni', 'Itahari', 'Dharan'],
      },
      {
        name: 'Taplejung',
        municipalities: ['Phungling', 'Meringden', 'Mikwakhola', 'Aathrai Tribeni', 'Maiwakhola', 'Phaktanglung', 'Sidingwa', 'Sirijangha', 'Yangwarak'],
      },
      {
        name: 'Terhathum',
        municipalities: ['Myanglung', 'Aathrai', 'Chhathar', 'Laligurans', 'Menchayam', 'Phedap'],
      },
      {
        name: 'Udayapur',
        municipalities: ['Triyuga', 'Belaka', 'Chaudandigadhi', 'Katari', 'Rautamai', 'Tapli', 'Udayapurgadhi'],
      },
    ],
  },
  {
    name: 'Madhesh',
    districts: [
      {
        name: 'Bara',
        municipalities: ['Kalaiya', 'Jitpur Simara', 'Mahagadhimai', 'Pacharauta', 'Pheta', 'Simraungadh', 'Adarshkotwal', 'Baragadhi', 'Bishrampur', 'Devtal', 'Karaiyamai', 'Kolhabi', 'Nijgadh', 'Prasauni', 'Suwarna'],
      },
      {
        name: 'Dhanusha',
        municipalities: ['Janakpur', 'Chhireshwarnath', 'Dhanusadham', 'Ganeshman Charnath', 'Hansapur', 'Kamala', 'Lakshminiya', 'Mithila', 'Mithila Bihari', 'Mukhiyapatti Musarmiya', 'Nagarain', 'Sahidnagar', 'Aaurahi', 'Bateshwar', 'Bideha', 'Dhanauji', 'Janaknandini', 'Sabaila'],
      },
      {
        name: 'Mahottari',
        municipalities: ['Jaleshwar', 'Bardibas', 'Gaushala', 'Samsi', 'Aurahi', 'Balkawa', 'Bhangaha', 'Ekdanra', 'Loharpatti', 'Mahottari', 'Manara', 'Matihani', 'Pipra', 'Ramgopalpur', 'Sonama'],
      },
      {
        name: 'Parsa',
        municipalities: ['Birgunj', 'Bahudarmai', 'Bindabasini', 'Chhipaharmai', 'Dhobini', 'Jagarnathpur', 'Jirabhawani', 'Kalikamai', 'Pakaha Mainpur', 'Paterwa Sugauli', 'Pokhariya', 'Sakhuwa Prasauni', 'Thori'],
      },
      {
        name: 'Rautahat',
        municipalities: ['Gaur', 'Chandrapur', 'Garuda', 'Gujara', 'Ishanath', 'Katahariya', 'Madhav Narayan', 'Maulapur', 'Paroha', 'Phatuwa Bijayapur', 'Rajdevi', 'Rajpur', 'Yemunamai'],
      },
      {
        name: 'Saptari',
        municipalities: ['Rajbiraj', 'Balan-Bihul', 'Bishnupur', 'Chhinnamasta', 'Dakneshwori', 'Hanumannagar Kankalini', 'Kanchanrup', 'Khadak', 'Mahadeva', 'Rupani', 'Saptakoshi', 'Shambhunath', 'Tilathi Koiladi', 'Tirahut'],
      },
      {
        name: 'Sarlahi',
        municipalities: ['Malangwa', 'Barahathawa', 'Haripur', 'Haripurwa', 'Ishwarpur', 'Kabilasi', 'Lalbandi', 'Ramnagar', 'Basbariya', 'Bramhapuri', 'Chandranagar', 'Dhankaul', 'Godaita', 'Hariwan', 'Haripur Municipality', 'Kaudena', 'Parsa', 'Ramnagar'],
      },
      {
        name: 'Siraha',
        municipalities: ['Siraha', 'Lahan', 'Dhangadhimai', 'Golbazaar', 'Mirchaiya', 'Naraha', 'Bhagwanpur', 'Bishnupur', 'Karjanha', 'Lakshmipur Patari', 'Nawarajpur', 'Sakhuwanankarkatti', 'Sukhipur'],
      },
    ],
  },
  {
    name: 'Bagmati',
    districts: [
      {
        name: 'Bhaktapur',
        municipalities: ['Bhaktapur', 'Changunarayan', 'Madhyapur Thimi', 'Suryabinayak'],
      },
      {
        name: 'Dhading',
        municipalities: ['Nilkantha', 'Dhunibesi', 'Gajuri', 'Galchi', 'Gangajamuna', 'Gerkhu', 'Jwalamukhi', 'Kaliash', 'Khaniyabas', 'Netrakali', 'Rubi Valley', 'Siddhalek', 'Thakre', 'Tripurasundari'],
      },
      {
        name: 'Kathmandu',
        municipalities: ['Kathmandu', 'Budhanilkantha', 'Chandragiri', 'Dakshinkali', 'Gokarneshwar', 'Kageshwari-Manohara', 'Kirtipur', 'Nagarjun', 'Shankharapur', 'Tarakeshwar', 'Tokha'],
      },
      {
        name: 'Kavrepalanchok',
        municipalities: ['Banepa', 'Dhulikhel', 'Panauti', 'Panchkhal', 'Namobuddha', 'Mandandeupur', 'Khanikhola', 'Bethanchok', 'Chaurideurali', 'Bhumlu', 'Temal', 'Roshi', 'Mahabharat'],
      },
      {
        name: 'Lalitpur',
        municipalities: ['Lalitpur', 'Godawari', 'Mahalaxmi', 'Konjyosom', 'Bagmati', 'Mahankal'],
      },
      {
        name: 'Nuwakot',
        municipalities: ['Bidur', 'Belkotgadhi', 'Dupcheshwar', 'Kakani', 'Kispang', 'Likhu', 'Meghang', 'Panchakanya', 'Shivapuri', 'Suryagadhi', 'Tadi', 'Tarakeshwar'],
      },
      {
        name: 'Ramechhap',
        municipalities: ['Manthali', 'Doramba', 'Gokulganga', 'Khadadevi', 'Likhu', 'Ramechhap', 'Sunapati', 'Umakunda'],
      },
      {
        name: 'Rasuwa',
        municipalities: ['Dhunche', 'Gosaikunda', 'Kalika', 'Naukunda', 'Uttargaya'],
      },
      {
        name: 'Sindhuli',
        municipalities: ['Kamalamai', 'Dudhouli', 'Golanjor', 'Hariharpurgadhi', 'Kalimati', 'Marin', 'Phikkal', 'Sunkoshi', 'Tinpatan'],
      },
      {
        name: 'Sindhupalchok',
        municipalities: ['Chautara', 'Bahrabise', 'Balephi', 'Barhabise', 'Bhotekoshi', 'Chautara Sangachokgadhi', 'Helambu', 'Indrawati', 'Jugal', 'Lisankhu Pakhar', 'Melamchi', 'Panchpokhari Thangpal', 'Sunkoshi', 'Tripurasundari'],
      },
    ],
  },
  {
    name: 'Gandaki',
    districts: [
      {
        name: 'Baglung',
        municipalities: ['Baglung', 'Badigad', 'Dhorpatan', 'Galkot', 'Jaimini', 'Kanthekhola', 'Nisikhola', 'Taman Khola'],
      },
      {
        name: 'Gorkha',
        municipalities: ['Gorkha', 'Aarughat', 'Ajirkot', 'Bhimsen', 'Chum Nubri', 'Dharche', 'Gandaki', 'Palungtar', 'Sahid Lakhan', 'Siranchok'],
      },
      {
        name: 'Kaski',
        municipalities: ['Pokhara', 'Annapurna', 'Machhapuchchhre', 'Madi', 'Rupa'],
      },
      {
        name: 'Lamjung',
        municipalities: ['Besisahar', 'Dordi', 'Dudhpokhari', 'Kwholasothar', 'Madhya Nepal', 'Marsyangdi', 'Rainas', 'Sundarbazar'],
      },
      {
        name: 'Manang',
        municipalities: ['Chame', 'Narphu', 'Nashong', 'Manang Ngisyang'],
      },
      {
        name: 'Mustang',
        municipalities: ['Gharpajhong', 'Lomanthang', 'Thasang', 'Waragung Muktikshetra', 'Baragung Muktikshetra'],
      },
      {
        name: 'Myagdi',
        municipalities: ['Beni', 'Annapurna', 'Dhaulagiri', 'Malika', 'Mangala', 'Raghuganga'],
      },
      {
        name: 'Nawalpur',
        municipalities: ['Kawasoti', 'Bardaghat', 'Devchuli', 'Gaindakot', 'Hupsekot', 'Madhyabindu', 'Panchakanya'],
      },
      {
        name: 'Parbat',
        municipalities: ['Kushma', 'Bihadi', 'Jaljala', 'Mahashila', 'Modi', 'Paiyun', 'Phalebas'],
      },
      {
        name: 'Syangja',
        municipalities: ['Putalibazar', 'Aandhikhola', 'Arjunchaupari', 'Bhirkot', 'Biruwa', 'Chapakot', 'Galyang', 'Kaligandaki', 'Phedikhola', 'Waling'],
      },
      {
        name: 'Tanahun',
        municipalities: ['Damauli', 'Aanbu Khaireni', 'Bandipur', 'Bhanu', 'Bhimad', 'Byas', 'Devghat', 'Ghiring', 'Myagde', 'Rishing', 'Shuklagandaki'],
      },
    ],
  },
  {
    name: 'Lumbini',
    districts: [
      {
        name: 'Arghakhanchi',
        municipalities: ['Sandhikharka', 'Bhumekasthan', 'Chhatradev', 'Malarani', 'Panini', 'Sitganga'],
      },
      {
        name: 'Banke',
        municipalities: ['Nepalgunj', 'Kohalpur', 'Baijanath', 'Duduwa', 'Janaki', 'Khajura', 'Narainapur', 'Rapti Sonari'],
      },
      {
        name: 'Bardiya',
        municipalities: ['Gulariya', 'Badhaiyatal', 'Bansgadhi', 'Barbardiya', 'Geruwa', 'Madhuwan', 'Rajapur', 'Thakurbaba'],
      },
      {
        name: 'Dang',
        municipalities: ['Ghorahi', 'Tulsipur', 'Banglachuli', 'Dangisharan', 'Gadhawa', 'Lamahi', 'Rapti', 'Shantinagar'],
      },
      {
        name: 'Gulmi',
        municipalities: ['Tamghas', 'Chandrakot', 'Dhurkot', 'Gulmidarbar', 'Isma', 'Kaligandaki', 'Madane', 'Malika', 'Musikot', 'Resunga', 'Ruru', 'Satyawati'],
      },
      {
        name: 'Kapilvastu',
        municipalities: ['Taulihawa', 'Banganga', 'Buddhabhumi', 'Kapilvastu', 'Krishnanagar', 'Maharajgunj', 'Mayadevi', 'Shivaraj', 'Suddhodhan', 'Yashodhara'],
      },
      {
        name: 'Nawalparasi (East)',
        municipalities: ['Gaindakot', 'Bardaghat', 'Devchuli', 'Hupsekot', 'Kawasoti', 'Madhyabindu', 'Palhinandan'],
      },
      {
        name: 'Palpa',
        municipalities: ['Tansen', 'Bagnaskali', 'Mathagadhi', 'Nisdi', 'Rambha', 'Rampur', 'Rainadevi Chhahara', 'Ribdikot', 'Tinau'],
      },
      {
        name: 'Parasi',
        municipalities: ['Ramgram', 'Bardaghat', 'Pratappur', 'Sarawal', 'Sunwal', 'Susta', 'Triveni'],
      },
      {
        name: 'Pyuthan',
        municipalities: ['Pyuthan', 'Aarghakhanchi', 'Gaumukhi', 'Jhimruk', 'Mallarani', 'Mand-vi', 'Nau Bahini', 'Sarumarani'],
      },
      {
        name: 'Rolpa',
        municipalities: ['Liwang', 'Duikholi', 'Ganga Dev', 'Madi', 'Runtigadhi', 'Sunchhahari', 'Sunilsmriti', 'Thabang', 'Tribeni'],
      },
      {
        name: 'Rupandehi',
        municipalities: ['Butwal', 'Siddharthanagar', 'Devdaha', 'Gaidahawa', 'Kanchan', 'Kotahimai', 'Lumbini Sanskritik', 'Marchawari', 'Mayadevi', 'Omsatiya', 'Rohini', 'Sainamaina', 'Siyari', 'Suddhodhan', 'Tillotama'],
      },
    ],
  },
  {
    name: 'Karnali',
    districts: [
      {
        name: 'Dailekh',
        municipalities: ['Narayan', 'Aathabis', 'Bhagawatimai', 'Chamunda Bindrasaini', 'Dullu', 'Gurans', 'Mahabu', 'Thantikandh'],
      },
      {
        name: 'Dolpa',
        municipalities: ['Thuli Bheri', 'Chharka Tangsong', 'Dolpo Buddha', 'Jagadulla', 'Kaike', 'Mudkechula', 'Shey Phoksundo', 'Tripurasundari'],
      },
      {
        name: 'Humla',
        municipalities: ['Simikot', 'Adanchuli', 'Chankheli', 'Kharpunath', 'Namkha', 'Sarkegad', 'Tanjakot'],
      },
      {
        name: 'Jajarkot',
        municipalities: ['Khalanga', 'Barekot', 'Chhedagad', 'Junichande', 'Nalagad', 'Shivalaya'],
      },
      {
        name: 'Jumla',
        municipalities: ['Chandannath', 'Guthichaur', 'Hima', 'Kanakasundari', 'Patarasi', 'Sinja', 'Tila'],
      },
      {
        name: 'Kalikot',
        municipalities: ['Khandachakra', 'Mahawai', 'Naraharinath', 'Palata', 'Pachaljharana', 'Raskot', 'Sanni Tribeni', 'Tilagufa'],
      },
      {
        name: 'Mugu',
        municipalities: ['Chhayanath Rara', 'Khatyad', 'Mugum Karmarong', 'Soru'],
      },
      {
        name: 'Rukum (East)',
        municipalities: ['Putha Uttarganga', 'Bhume', 'Sisne'],
      },
      {
        name: 'Salyan',
        municipalities: ['Salyan', 'Bagchaur', 'Bangad Kupinde', 'Chhatreshwori', 'Darma', 'Dhorchaur', 'Kalimati', 'Kapurkot', 'Kumakh', 'Sharada', 'Tribeni'],
      },
      {
        name: 'Surkhet',
        municipalities: ['Birendranagar', 'Barahatal', 'Bheriganga', 'Chaukune', 'Chingad', 'Gurbhakot', 'Lekbeshi', 'Panchpuri', 'Simta'],
      },
    ],
  },
  {
    name: 'Sudurpashchim',
    districts: [
      {
        name: 'Achham',
        municipalities: ['Mangalsen', 'Bannigadhi Jayagadh', 'Chaurpati', 'Dhakari', 'Kamalbazar', 'Mellekh', 'Panchadewal Binayak', 'Ramaroshan', 'Sanphebagar', 'Turmakhad'],
      },
      {
        name: 'Baitadi',
        municipalities: ['Dasharathchand', 'Dilasaini', 'Dogadakedar', 'Melauli', 'Pancheshwar', 'Patan', 'Purchaudi', 'Shivanath', 'Sigas'],
      },
      {
        name: 'Bajhang',
        municipalities: ['Jayaprithvi', 'Bithadchir', 'Chabispathivera', 'Durgathali', 'Kedarseu', 'Khaptadchhanna', 'Masta', 'Saipal', 'Surma', 'Talkot', 'Thalara'],
      },
      {
        name: 'Bajura',
        municipalities: ['Budhiganga', 'Badimalika', 'Budhinanda', 'Gaumul', 'Himali', 'Jagannath', 'Khaptadchhededaha', 'Swami Kartik'],
      },
      {
        name: 'Dadeldhura',
        municipalities: ['Amargadhi', 'Ajaymeru', 'Alital', 'Bhageshwar', 'Ganyapdhura', 'Nawadurga', 'Parashuram'],
      },
      {
        name: 'Darchula',
        municipalities: ['Shailyashikhar', 'Apihimal', 'Byas', 'Duhun', 'Lekam', 'Marma', 'Naugadh', 'Vyans'],
      },
      {
        name: 'Doti',
        municipalities: ['Dipayal Silgadhi', 'Adarsha', 'Badikedar', 'Bogtan', 'Jorayal', 'K I Singh', 'Purbichauki', 'Sayal'],
      },
      {
        name: 'Kailali',
        municipalities: ['Dhangadhi', 'Tikapur', 'Bhajani', 'Chure', 'Gauriganga', 'Godawari', 'Janaki', 'Joshipur', 'Kailari', 'Lamki Chuha', 'Mohanyal', 'Shuklaphanta'],
      },
      {
        name: 'Kanchanpur',
        municipalities: ['Bhimdatta', 'Bedkot', 'Belauri', 'Dodhara Chandani', 'Krishnapur', 'Laljhadi', 'Mahakali', 'Punarbas', 'Shuklaphanta'],
      },
    ],
  },
];

// Helper functions to get filtered data
export const getProvinces = () => {
  return nepalProvinces.map((p) => ({ value: p.name, label: p.name }));
};

export const getDistrictsByProvince = (provinceName: string) => {
  const province = nepalProvinces.find((p) => p.name === provinceName);
  if (!province) return [];
  return province.districts.map((d) => ({ value: d.name, label: d.name }));
};

export const getMunicipalitiesByDistrict = (provinceName: string, districtName: string) => {
  const province = nepalProvinces.find((p) => p.name === provinceName);
  if (!province) return [];
  const district = province.districts.find((d) => d.name === districtName);
  if (!district) return [];
  return district.municipalities.map((m) => ({ value: m, label: m }));
};

