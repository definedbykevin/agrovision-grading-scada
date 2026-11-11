import React, { useState, useEffect } from 'react'
import './SecurityLogsheetHub.css'

import AllStationsLogsheet from './all-stations/AllStationsLogsheet'
import SecurityLogsheet from './security/SecurityLogsheet'
import PressLogsheet from './press/PressLogsheet'
import SterilizerLogsheet from './sterilizer/SterilizerLogsheet'
import ThreshingLogsheet from './threshing/ThreshingLogsheet'
import KernelPlantLogsheet from './kernel-plant/KernelPlantLogsheet'
import BoilerHouseLogsheet from './boiler-house/BoilerHouseLogsheet'
import EngineRoomLogsheet from './engine-room/EngineRoomLogsheet'
import GradingRampLogsheet from './grading-ramp/GradingRampLogsheet'
import WeighbridgeLogsheet from './weighbridge/WeighbridgeLogsheet'
import CmrsLogsheet from './cmrs/CmrsLogsheet'
import DafOsrLogsheet from './daf-osr/DafOsrLogsheet'
import EfbPlantLogsheet from './efb-plant/EfbPlantLogsheet'
import EffluentTreatmentLogsheet from './effluent-treatment/EffluentTreatmentLogsheet'
import LoadingRampLogsheet from './loading-ramp/LoadingRampLogsheet'
import OilClarificationRoomLogsheet from './oil-clarification-room/OilClarificationRoomLogsheet'
import RawWaterTreatmentLogsheet from './raw-water-treatment/RawWaterTreatmentLogsheet'

const STATION_COMPONENTS = {
    'all-stations': AllStationsLogsheet,
    'security': SecurityLogsheet,
    'press': PressLogsheet,
    'sterilizer': SterilizerLogsheet,
    'threshing': ThreshingLogsheet,
    'kernel-plant': KernelPlantLogsheet,
    'boiler-house': BoilerHouseLogsheet,
    'engine-room': EngineRoomLogsheet,
    'grading-ramp': GradingRampLogsheet,
    'weighbridge': WeighbridgeLogsheet,
    'cmrs': CmrsLogsheet,
    'daf-osr': DafOsrLogsheet,
    'efb-plant': EfbPlantLogsheet,
    'effluent-treatment': EffluentTreatmentLogsheet,
    'loading-ramp': LoadingRampLogsheet,
    'oil-clarification': OilClarificationRoomLogsheet,
    'raw-water-treatment': RawWaterTreatmentLogsheet
}

const FIXED_ALL_STATIONS_TAB = { slug: 'all-stations', title: 'ALL STATIONS', is_active: 1 }

export default function SecurityLogsheetHub() {
    const [stations, setStations] = useState([FIXED_ALL_STATIONS_TAB])
    const [activeSlug, setActiveSlug] = useState('all-stations')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const token = localStorage.getItem('kip_token')
                const res = await fetch('/api/config/stations', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                })
                const result = await res.json()
                if (result.success && Array.isArray(result.data)) {
                    // Filter only active stations (is_active === 1)
                    const activeDbStations = result.data.filter(s => s.is_active === 1)
                    setStations([FIXED_ALL_STATIONS_TAB, ...activeDbStations])
                }
            } catch (err) {
                console.error('Failed to fetch active stations for SecurityLogsheetHub:', err)
                // Fallback default list if API offline
                setStations([
                    FIXED_ALL_STATIONS_TAB,
                    { slug: 'security', title: 'SECURITY', is_active: 1 },
                    { slug: 'press', title: 'PRESS STATION', is_active: 0 },
                    { slug: 'sterilizer', title: 'STERILIZER STATION', is_active: 0 },
                    { slug: 'threshing', title: 'THRESHING STATION', is_active: 0 },
                    { slug: 'kernel-plant', title: 'KERNEL PLANT', is_active: 0 },
                    { slug: 'boiler-house', title: 'BOILER HOUSE', is_active: 0 },
                    { slug: 'engine-room', title: 'ENGINE ROOM', is_active: 0 },
                    { slug: 'grading-ramp', title: 'GRADING RAMP', is_active: 0 },
                    { slug: 'weighbridge', title: 'WEIGHBRIDGE', is_active: 0 },
                    { slug: 'cmrs', title: 'CMRS', is_active: 0 },
                    { slug: 'daf-osr', title: 'DAF / OSR', is_active: 0 },
                    { slug: 'efb-plant', title: 'EFB PLANT', is_active: 0 },
                    { slug: 'effluent-treatment', title: 'EFFLUENT TREATMENT', is_active: 0 },
                    { slug: 'loading-ramp', title: 'LOADING RAMP', is_active: 0 },
                    { slug: 'oil-clarification', title: 'OIL CLARIFICATION ROOM', is_active: 0 },
                    { slug: 'raw-water-treatment', title: 'RAW WATER TREATMENT', is_active: 0 }
                ].filter(s => s.is_active === 1))
            } finally {
                setLoading(false)
            }
        }
        fetchStations()
    }, [])

    const activeStationInfo = stations.find(s => s.slug === activeSlug) || { slug: activeSlug, title: activeSlug.toUpperCase() }
    const ActiveComponent = STATION_COMPONENTS[activeSlug] || AllStationsLogsheet

    const tabBar = (
        <div className="security-hub-tabs-wrapper">
            {stations.map((st) => (
                <button
                    key={st.slug}
                    className={`security-hub-tab-pill ${activeSlug === st.slug ? 'active' : ''}`}
                    onClick={() => setActiveSlug(st.slug)}
                    title={st.title?.toUpperCase()}
                >
                    {st.title?.toUpperCase()}
                </button>
            ))}
        </div>
    )

    if (loading) {
        return <div className="security-hub-loading">LOADING ACTIVE STATIONS FROM DATABASE...</div>
    }

    return (
        <div className="security-hub-container">
            <ActiveComponent
                stationSlug={activeStationInfo.slug}
                stationTitle={activeStationInfo.title?.toUpperCase()}
                tabBar={tabBar}
            />
        </div>
    )
}
