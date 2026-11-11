import { useId } from 'react';

// Code-native illustration for explicitly labelled example mode; not CCTV evidence.
export default function CameraScene({ compact = false }) {
    const id = useId().replaceAll(':', '');
    return <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" className="cpo-camera-scene" role="img" aria-label="Ilustrasi area loading CPO dengan truk tangki; bukan rekaman CCTV">
        <defs>
            <linearGradient id={`${id}ground`} x2=".8" y2="1"><stop stopColor="#526268" /><stop offset="1" stopColor="#1d303b" /></linearGradient>
            <linearGradient id={`${id}tank`} x2="0" y2="1"><stop stopColor="#e0e9e8" /><stop offset=".4" stopColor="#aebfc3" /><stop offset="1" stopColor="#526d79" /></linearGradient>
            <linearGradient id={`${id}shade`} x2="0" y2="1"><stop stopColor="#061922" stopOpacity=".3" /><stop offset=".6" stopColor="#061922" stopOpacity="0" /><stop offset="1" stopColor="#061922" stopOpacity=".5" /></linearGradient>
        </defs>
        <rect width="1000" height="560" fill={`url(#${id}ground)`} />
        <path d="M0 0H1000V96L750 124 488 93 190 149 0 111Z" fill="#1e3536" />
        <path d="M0 119L195 157 490 102 753 132 1000 102" fill="none" stroke="#8c9b8d" strokeWidth="8" opacity=".55" />
        {[70, 180, 325, 505, 690, 880, 965].map((x, i) => <g key={x} transform={`translate(${x} ${30 + i % 3 * 18})`}><path d="M0 55V-10" stroke="#a1aba1" strokeWidth="4" /><path d="M-33 2Q0-35 31 6M-38-8Q0-42 37-10M-22-25Q0-50 21-29" stroke="#37584a" strokeWidth="13" fill="none" /></g>)}
        <path d="M700 0H1000V365L928 331V96L724 76Z" fill="#354e58" />
        <path d="M715 76L925 97 1000 40 822 15Z" fill="#a9b3b2" />
        <path d="M715 76L925 97V116L715 96Z" fill="#5f7a82" />
        {[740, 925].map(x => <path key={x} d={`M${x} 94V327`} stroke="#75929b" strokeWidth="10" />)}
        <path d="M700 331L1000 392V438L666 365Z" fill="#182b33" opacity=".45" />
        <path d="M310 305L197 560M485 314L428 560M658 320L665 560M820 340L910 560" stroke="#d4b95d" strokeWidth="5" opacity=".75" />
        <path d="M323 490L454 507M550 513L691 535" stroke="#d4b95d" strokeWidth="4" strokeDasharray="18 10" opacity=".65" />
        <path d="M80 248L590 165M53 386L639 210M360 560L745 226" stroke="#a7b4b4" strokeWidth="1" opacity=".12" />
        <g transform="translate(442 212) rotate(9)">
            <ellipse cx="51" cy="130" rx="100" ry="25" fill="#0c202b" opacity=".45" />
            <path d="M-35 17L28-9 139 34 78 64Z" fill="#f0eecc" />
            <path d="M-35 17V84L78 132V64Z" fill="#c5cdbb" /><path d="M78 64L139 34V104L78 132Z" fill="#839da0" />
            <path d="M-27 29L17 11 23 48-28 53Z" fill="#284953" /><path d="M29 14L70 32V65L29 49Z" fill="#355964" />
            <path d="M-30 61L72 103" stroke="#748c80" strokeWidth="3" /><path d="M86 67L130 46V78L86 98Z" fill="#2e515e" />
            <ellipse cx="-11" cy="88" rx="12" ry="20" fill="#102733" /><ellipse cx="-11" cy="88" rx="6" ry="11" fill="#6f858d" /><ellipse cx="66" cy="121" rx="12" ry="20" fill="#102733" /><ellipse cx="66" cy="121" rx="6" ry="11" fill="#6f858d" />
            <path d="M-7-15L48-77Q66-91 90-79L177-43Q198-33 183-13L139 33 77 62Z" fill={`url(#${id}tank)`} />
            <ellipse cx="108" cy="26" rx="36" ry="24" transform="rotate(23 108 26)" fill="#91a9af" stroke="#c6d3d3" strokeWidth="3" />
            <path d="M53-59L151-20M29-34L129 4" stroke="#738d99" strokeWidth="3" opacity=".7" /><path d="M74-77L145-49" stroke="#f3f4dc" strokeWidth="6" />
            <path d="M139 55L179 8" stroke="#283f4e" strokeWidth="8" /><ellipse cx="143" cy="63" rx="9" ry="16" fill="#122937" /><ellipse cx="169" cy="34" rx="9" ry="16" fill="#122937" />
        </g>
        {!compact && <g transform="translate(155 185) scale(.65)"><path d="M-35 70L50 100 178 48 85 12Z" fill="#0f2730" opacity=".35" /><path d="M0 0L67-23 152 3 86 35Z" fill="#b7c7c4" /><path d="M0 0V58L86 91V35Z" fill="#8da7ac" /><path d="M86 35L152 3V62L86 91Z" fill="#597c87" /><path d="M12 8L59-8V24L12 31Z" fill="#234955" /><ellipse cx="21" cy="64" rx="11" ry="18" fill="#102a36" /><ellipse cx="76" cy="86" rx="11" ry="18" fill="#102a36" /><path d="M61-33L106-80Q123-94 144-78L219-48Q240-35 216-11L154 4 89 33Z" fill={`url(#${id}tank)`} /></g>}
        <rect width="1000" height="560" fill={`url(#${id}shade)`} />
    </svg>;
}
