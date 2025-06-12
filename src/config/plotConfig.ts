// src/config/plotConfig.ts

// Kolom DEPTH yang digunakan untuk sumbu Y
export const DEPTH_COL = 'DEPTH'; 

// Lebar garis default
export const LINE_WIDTH = 0.9;

export const NULL_VALUE = -999.25; // Keep this line from plot-display

// Dictionary Warna
export const colorsDict: Record<string, string> = {
  blue: 'royalblue',
  red: 'tomato',
  orange: '#FF9900',      
  green: '#109618',       
  purple: '#990099',      
  cyan: '#0099C6',        
  magenta: '#DD4477',     
  sage: '#66AA00',        
  maroon: '#B82E2E',      
  navy: '#316395',        
  gray: 'gray',
  lightgray: 'lightgray',
  black: 'rgba(62, 62, 62, 1)',
};

// Legends untuk setiap plot legend1 - legend16
export const legends: string[] = ["legend"];

for (let i = 2; i <= 16; i++) {
  legends.push(`legend${i}`);
}

// Konfigurasi sumbu X dan Y
export const axes: string[] = ['xaxis', 'yaxis'];

for (let i = 0; i < 16; i++) {
  axes.push(`xaxis${i + 1}`);
  axes.push(`yaxis${i + 1}`);
}

// Kumpulan column yang ingin ditampilkan pada plot berdasarkan "key"
export const dataCol: Record<string, string[]> = {
    'DNS':['DNS'],
    'MARKER': ['MARKER'],
    'GR': ['GR'],
    'GR_NORM': ['GR_NORM'],
    'GR_DUAL': ['GR', 'GR_NORM'],
    'RT': ['RT'],
    'RT_RO': ['RT','RO'],
    'X_RT_RO': ['RT_RO'],
    'NPHI_RHOB_NON_NORM': ['NPHI','RHOB'],
    'RHOB': ['RHOB'],
    'NPHI_RHOB': ['NPHI','RHOB','NPHI_NORM','RHOB_NORM_NPHI'],
    'SW': ['SW'],
    'PHIE_PHIT': ['PHIE', 'PHIT'],
    'PERM': ['PERM'],
    'VCL': ['VCL'],
    'RWAPP_RW': ['RWAPP','RW'],
    'X_RWA_RW': ['RWA_RW'],
    'RT_F': ['RT','F'],
    'X_RT_F': ['RT_F'],
    'RT_RHOB': ['RT', 'RHOB' ,'RT_NORM', 'RHOB_NORM_RT'],
    'X_RT_RHOB': ['RT_RHOB'],
    'TEST': ['TEST'],
    'XPT': ['XPT'],
    'RT_RGSA': ['RT', 'RGSA'],
    'NPHI_NGSA': ['NPHI', 'NGSA'],
    'RHOB_DGSA': ['RHOB', 'DGSA'],
    'ZONA': ['ZONA'],
    'VSH': ['VSH'],
    'SP': ['SP'],
    'VSH_LINEAR': ['VSH_LINEAR'],
    'VSH_DN': ['VSH_DN'],
    'VSH_SP': ['VSH_SP'],
    'PHIE_DEN':['PHIE','PHIE_DEN'],
    'PHIT_DEN':['PHIT','PHIT_DEN'],
    'RESERVOIR_CLASS': ['RESERVOIR_CLASS'],
    'RWA': ['RWA_FULL','RWA_SIMPLE','RWA_TAR'],
    'PHIE': ['PHIE'],
    'RT_GR': ['RT','GR','RT_NORM', 'GR_NORM_RT'],
    // 'RT_PHIE':['RT','PHIE','RT_NORM', 'PHIE_NORM_RT'],
    'RT_PHIE':['RT','PHIE'],
    'RGBE': ['RGBE'],
    'RPBE': ['RPBE'],
    'IQUAL': ['IQUAL'],
    'SWARRAY': ['SWARRAY_10','SWARRAY_25'],
    'SWGRAD': ['SWGRAD']

    // Kemungkinan ada tambahan..
};

// Konfigurasi unit (SATUAN) untuk setiap log/fitur
export const unitCol: Record<string, string[]> = {
    'DNS': [''],
    'MARKER': [''],
    'GR_NORM': ['GAPI'],
    'GR': ['GAPI'],
    'GR_DUAL': ['GAPI', 'GAPI'],
    'RT': ['OHMM'],
    'RT_RO': ['OHMM','OHMM'],
    'X_RT_RO': ['V/V'],
    'NPHI_RHOB_NON_NORM': ['V/V','G/C3'],
    'NPHI_RHOB': ['V/V','G/C3','V/V','G/C3'],
    'RHOB': ['G/C3'],
    'SW': ['DEC'],
    'PHIE_PHIT': ['V/V', 'V/V'],
    'PERM': ['mD'],
    'VCL': ['V/V'],
    'RWAPP_RW': ['OHMM','OHMM'],
    'X_RWA_RW': ['V/V'],
    'RT_F': ['OHMM','V/V'],
    'X_RT_F': ['V/V'],
    'RT_RHOB': ['OHMM', 'G/C3','OHMM', 'G/C3'],
    'X_RT_RHOB': ['V/V'],
    'TEST': ['V/V'],
    'CLASS': ['V/V'],
    'CTC': ['V/V'],
    'XPT': [''],
    'RT_RGSA': ['OHMM', ''],
    'NPHI_NGSA': ['V/V', ''],
    'RHOB_DGSA': ['G/C3', ''],
    'ZONA': [''],
    'VSH': ['V/V'],
    'SP': ['MV'],
    'VSH_LINEAR': ['V/V'],
    'VSH_DN': ['V/V'],
    'VSH_SP': ['V/V'],
    'PHIE_DEN':['',''],
    'PHIT_DEN':['',''],
    'RESERVOIR_CLASS': [''],
    'RWA': ['OHMM','OHMM','OHMM'],
    'PHIE': [''],
    'RT_GR': ['OHMM','GAPI','OHMM','GAPI'],
    // # 'RT_PHIE':['OHMM','','OHMM',''],
    'RT_PHIE':['OHMM',''],
    'RGBE': [''],
    'RPBE': [''],
    'IQUAL': [''],
    'SWARRAY': ['V/V','V/V'],
    'SWGRAD': ['V/V']

    // Kemungkinan ada tambahan..
};

// Konfigurasi warna untuk setiap kurva log (Selain 'FLAG')
export const colorCol: Record<string, string[]> = {
    'DNS': ['darkgreen'],
    'MARKER': [colorsDict['black']],
    'GR_NORM': ['orange'],
    'GR_DUAL': ['darkgreen', 'orange'],
    'GR': ['darkgreen'],
    'RT': [colorsDict['red']],
    'RT_RO': [colorsDict['red'], colorsDict['purple']],
    'X_RT_RO': [colorsDict['black']],
    'NPHI_RHOB_NON_NORM': [colorsDict['blue'], colorsDict['red']],
    'NPHI_RHOB': [colorsDict['blue'], colorsDict['red'], colorsDict['blue'], colorsDict['red']],
    'RHOB': [colorsDict['red']],
    'SW': [colorsDict['blue']],
    'PHIE_PHIT': ['darkblue', colorsDict['cyan']],
    'PERM': [colorsDict['blue']],
    'VCL': [colorsDict['black']],
    'RWAPP_RW': [colorsDict['black'], colorsDict['blue']],
    'X_RWA_RW': [colorsDict['black']],
    'RT_F': [colorsDict['red'], colorsDict['cyan']],
    'X_RT_F': [colorsDict['black']],
    'RT_RHOB': [colorsDict['red'], colorsDict['black'], colorsDict['red'], colorsDict['green']],
    'X_RT_RHOB': [colorsDict['black']],
    'TEST': [colorsDict['black']],
    'CLASS': [colorsDict['black']],
    'CTC': [colorsDict['black']],
    'XPT': [colorsDict['black']],
    'RT_RGSA': [colorsDict['red'], colorsDict['blue']],
    'NPHI_NGSA': [colorsDict['red'], colorsDict['green']],
    'RHOB_DGSA': [colorsDict['red'], colorsDict['green']],
    'ZONA': [colorsDict['black']],
    'VSH': ['darkblue'],
    'SP': ['darkblue'],
    'VSH_LINEAR': ['darkblue'],
    'VSH_DN': ['darkblue'],
    'VSH_SP': ['darkblue'],
    'PHIE_DEN':['darkblue',colorsDict['blue']],
    'PHIT_DEN':[colorsDict['red'], colorsDict['orange']],
    'RESERVOIR_CLASS': [colorsDict['black']],
    'RWA': ['darkblue','darkgreen',colorsDict['red']],
    'PHIE': ['darkblue'],
    'RT_GR': [colorsDict['red'],'darkgreen',colorsDict['red'],'darkgreen'],
    // 'RT_PHIE':[colorsDict['red'],'darkblue',colorsDict['red'],'darkblue'],
    'RT_PHIE':[colorsDict['red'],'darkblue'],
    'RGBE': [colorsDict['black']],
    'RPBE': [colorsDict['black']],
    'IQUAL': [colorsDict['black']],
    'SWARRAY': ['darkblue','orange'],
    'SWGRAD': ['darkgreen']

    // Kemungkinan ada tambahan..
};

// Konfigurasi warna untuk setiap flag
export const flagColor: Record<string, Record<number, string>> = {
  "TEST": {
    0: 'rgba(0,0,0,0)',
    1: colorsDict.cyan,
    3: colorsDict.green
  },
  "CLASS": {
    0: '#d9d9d9',
    1: '#00bfff',
    2: '#ffb6c1',
    3: '#a020f0',
    4: '#ffa600',
    5: '#8b1a1a',
    6: '#000000'
  },
  "ZONA": {
    3: colorsDict.red,
    2: colorsDict.orange,
    1: 'yellow',
    0: colorsDict.black,
  },
  "RESERVOIR_CLASS": {
    4: 'green',
    3: 'yellow',
    2: 'orange',
    1: 'black',
    0: 'gray'
  },
  "IQUAL": {
    1: 'green',
  }

  // Kemungkinan ada tambahan..
};

// Range setiap fitur log 
export const rangeCol = {
  'GR': [[0,250]],
    'GR_NORM': [[0,250]],
    'GR_DUAL': [[0, 250], [0, 250]],
    'RT': [[0.02, 2000]],
    'RT_RO': [[0.02, 2000], [0.02, 2000]],
    'X_RT_RO': [[0,4]],
    'NPHI_RHOB_NON_NORM': [[0.6, 0],[1.71,2.71]],
    'NPHI_RHOB': [[0.6, 0],[1.71,2.71],[1,0],[1,0]],
    'RHOB': [[1.71, 2.71]],
    'SW': [[1, 0]],
    'PHIE_PHIT': [[0.5,0],[0.5,0]],
    'PERM': [[0.02, 2000]],
    'VCL': [[0,1]],
    'RWAPP_RW': [[0.01, 1000],[0.01, 1000]],
    'X_RWA_RW': [[0,4]],
    'RT_F': [[0.02, 2000], [0.02, 2000]],
    'X_RT_F': [[0,2]],
    'RT_RHOB': [[0.01, 1000],[1.71,2.71],[0, 1],[0,1]],
    'X_RT_RHOB': [[-0.5,0.5]],
    'XPT': [[0,1]],
    'RT_RGSA': [[0.02, 2000], [0.02, 2000]],
    'NPHI_NGSA': [[0.6, 0], [0.6, 0]],
    'RHOB_DGSA': [[1.71, 2.71], [1.71, 2.71]],
    'VSH': [[0, 1]],
    'SP': [[-160,40]],
    'VSH_LINEAR': [[0, 1]],
    'VSH_DN': [[0, 1]],
    'VSH_SP': [[0, 1]],
    'PHIE_DEN':[[0,1],[0,1]],
    'PHIT_DEN':[[0,1],[0,1]],
    'RWA': [[0,60],[0,60],[0,60]],
    'PHIE': [[0.6,0]], 
    'RT_GR': [[0.02, 2000],[0,250],[0.02, 2000],[0,250]],
    // 'RT_PHIE':[[0.02, 2000],[0.6,0],[0.02, 2000],[0.6,0]],
    'RT_PHIE':[[0.02, 2000],[0.6,0]],
    'SWARRAY': [[1,0],[1,0],[1,0],[1,0]],
    'SWGRAD': [[0,0.1]],
    'DNS': [[-1,1]],
    'DNSV': [[-1,1]],

    // Kemungkinan ada tambahan..
};

// Ratio plots untuk mengatur lebar setiap kolom plot
export const ratioPlots: Record<string, number> = {
  'MARKER': 0.5,
    'GR': 1,
    'GR_NORM': 1,
    'GR_DUAL': 1,
    'RT': 0.5,
    'RT_RO': 1,
    'X_RT_RO': 0.5,
    'NPHI_RHOB_NON_NORM': 1,
    'NPHI_RHOB': 1,
    'RHOB': 1,
    'SW': 1,
    'PHIE_PHIT': 1,
    'PERM': 1,
    'VCL': 1,
    'RWAPP_RW': 1,
    'X_RWA_RW': 0.5,
    'RT_F': 1,
    'X_RT_F': 0.5,
    'RT_RHOB': 1,
    'X_RT_RHOB': 0.5,
    'TEST': 0.5,
    'CLASS': 0.5,
    'CTC': 0.5,
    'XPT': 1,
    'RT_RGSA': 1,
    'NPHI_NGSA': 1,
    'RHOB_DGSA': 1,
    'ZONA': 1,
    'VSH' : 1,
    'SP' : 1,
    'VSH_LINEAR' : 1,
    'VSH_DN' : 1,
    'VSH_SP' : 1,
    'PHIE_DEN':1,
    'PHIT_DEN':1,
    'RESERVOIR_CLASS': 0.5,
    'RWA': 1,
    'PHIE': 1,
    'RT_GR': 1,
    'RT_PHIE': 1,
    'RGBE': 0.5,
    'RPBE': 0.5,
    'RGBE_TEXT': 0.5,
    'RPBE_TEXT': 0.5,
    'IQUAL': 0.5,
    'SWARRAY': 1,
    'SWGRAD': 0.5,
    'DNS': 1,
    'DNSV': 1,
    // Kemungkinan ada tambahan..
};

// Konfigurasi nama untuk setiap flag
export const flagsName: Record<string, Record<number, string>> = {
  'TEST': {
    0: "",
    1: 'Water',
    3: 'Gas'
  },
  'CLASS': {
    0: 'Non Reservoir',
    1: 'Water',
    2: 'LRLC-Potential',
    3: 'LRLC-Proven',
    4: 'LC-Res',
    5: 'Non-LCRes',
    6: 'Coal'
  },
  'ZONA':{
    0: 'Zona Prospek Kuat',
    1: 'Zona Menarik',
    2: 'Zona Lemah',
    3: 'Non Prospek',
  },
  'RESERVOIR_CLASS':{
    0: 'Zona Prospek Kuat',
    1: 'Zona Menarik',
    2: 'Zona Lemah',
    3: 'Non Prospek',
    4: 'No Data'
  },
  'IQUAL':{
    1: '1'
  }

  // Kemungkinan ada tambahan..
};

// Thresholds untuk menentukan label pada plot
export const thres: Record<string, number> = {
  'X_RT_RO': 1,
  'X_RWA_RW': 1.4,
  'X_RT_F': 0.7,
  'X_RT_RHOB': 0.02

  // Kemungkinan ada tambahan..
};