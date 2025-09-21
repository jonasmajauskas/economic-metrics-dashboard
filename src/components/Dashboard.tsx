import React, { useState, useMemo } from 'react';
import Header from './Header';
import MacroeconomicPanel from './panels/MacroeconomicPanel';
import USEconomicsPanel from './panels/USEconomicsPanel';
import GlobalIndicesPanel from './panels/GlobalIndicesPanel';
import AssetsPanel from './panels/AssetsPanel';
import YieldCurvesPanel from './panels/YieldCurvesPanel';
import FXRatesPanel from './panels/FXRatesPanel';
import CollapsibleContainer from './CollapsibleContainer';
import { TrendingUp, DollarSign, BarChart4, Wallet, LineChart, RefreshCcw, Loader } from 'lucide-react';

import { useWorldBankData } from "../api/useWorldBankData";

import {
  useECBDataByCountry,            // GDP totals (million EUR)
  useECBGdpPerCapitaComputed,     // GDP per capita (computed)
  useECBInflationByCountry,       // HICP y/y %
  useECBUnemploymentByCountry,    // Unemployment rate %
  useEurostatLongTermRatesByCountry,
} from '../api/useECBData';

import type { ByCountryMillion } from '../api/useECBData';

const Dashboard: React.FC = () => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    macroeconomic: true,
    useconomics: true,
    globalindices: true,
    assets: true,
    yieldcurves: true,
    fxrates: true,
  });

  // --- ECB Data ---
  const { data: gdpData, isLoading, error } = useECBDataByCountry();
  const { data: inflationData, isLoading: inflLoading, error: inflError } = useECBInflationByCountry();
  const { data: unemploymentData, isLoading: unempLoading, error: unempError } = useECBUnemploymentByCountry();

  const population: Record<string, number> = {
    DE: 84_000_000,
    FR: 68_000_000,
    ES: 48_000_000,
    NL: 18_000_000,
    IT: 59_000_000,
    LT: 2_900_000,
    EE: 1_360_000,
    LV: 1_850_000,
  };
  const { data: gdpPerCap } = useECBGdpPerCapitaComputed(gdpData, population);

  const { data: longTermRates } =
    useEurostatLongTermRatesByCountry();

  // --- World Bank Data ---
  const {
    gdpData: gdpWB,
    gdpPerCapitaData: gdpPcWB,
    inflationData: inflWB,
    unemploymentData: unempWB,
    interestRateData: bondWB,
    isLoading: wbLoading,
    error: wbError,
  } = useWorldBankData();

    // const normalizedGdpWB: ByCountryMillion = gdpWB
    // ? Object.fromEntries(
    //     Object.entries(gdpWB).map(([cc, { period, value }]) => [
    //       cc,
    //       { period, valueMillion: value },
    //     ])
    //   )
    // : {};

// --- Normalize World Bank data ---
const ISO3_TO_ISO2: Record<string, string> = {
  USA: "US",
  CHN: "CN",
  JPN: "JP",
  RUS: "RU",
  IND: "IN",
};

function normalizeWB<T extends Record<string, any> | null | undefined>(
  data: T,
  isGDP = false
): Record<string, any> {
  if (!data) return {};

  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const iso2 = ISO3_TO_ISO2[key] || key;
    if (isGDP) {
      // WB GDP is absolute → convert to millions
      normalized[iso2] = {
        period: (value as any).period,
        valueMillion: (value as any).value / 1_000_000, // ✅ Convert to millions
      };
    } else {
      normalized[iso2] = value;
    }
  }
  return normalized;
}



// --- Merge ECB + World Bank ---
const mergedGDP: ByCountryMillion = {
  ...gdpData,
  ...normalizeWB(gdpWB, true), // ✅ normalized to millions
};


const mergedGDPperCap = { ...gdpPerCap, ...normalizeWB(gdpPcWB) };
const mergedInflation = { ...inflationData, ...normalizeWB(inflWB) };
const mergedUnemployment = { ...unemploymentData, ...normalizeWB(unempWB) };
const mergedInterestRates = { ...longTermRates, ...normalizeWB(bondWB) };


  // --- Merge ECB + World Bank ---

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAllSections = () => {
    const areAllOpen = Object.values(openSections).every(Boolean);
    const newState = Object.keys(openSections).reduce((acc, section) => {
      acc[section] = !areAllOpen;
      return acc;
    }, {} as { [key: string]: boolean });
    setOpenSections(newState);
  };

  const areAllSectionsOpen = useMemo(
    () => Object.values(openSections).every(Boolean),
    [openSections]
  );

  // --- Loading & Error states ---
  if (isLoading || wbLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">Loading data...</p>
        <Loader className="animate-spin w-5 h-5 text-primary ml-1" />
      </div>
    );
  }

  if (error || wbError) {
    return <div>Error loading data: {error || wbError}</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        areAllSectionsOpen={areAllSectionsOpen}
        toggleAllSections={toggleAllSections}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <CollapsibleContainer
          title="Global Economics (annual)"
          isOpen={openSections.macroeconomic}
          onToggle={() => toggleSection('macroeconomic')}
          icon={<TrendingUp size={18} />}
        >
          <MacroeconomicPanel
            gdpData={mergedGDP}
            gdpPerCapitaData={mergedGDPperCap}
            inflationData={mergedInflation}
            unemploymentData={mergedUnemployment}
            interestRateData={mergedInterestRates}
          />

          {/* Inline non-blocking status for inflation & unemployment */}
          {(inflLoading || unempLoading) && (
            <div className="mt-2 text-xs text-muted-foreground">
              {inflLoading ? 'Loading ECB inflation… ' : ''}
              {unempLoading ? 'Loading ECB unemployment…' : ''}
            </div>
          )}
          {(inflError || unempError) && (
            <div className="mt-2 text-xs text-red-500">
              {inflError ? `Inflation fetch error: ${inflError}` : ''}
              {inflError && unempError ? ' · ' : ''}
              {unempError ? `Unemployment fetch error: ${unempError}` : ''}
            </div>
          )}
        </CollapsibleContainer>

        <CollapsibleContainer
          title="US Economics"
          isOpen={openSections.useconomics}
          onToggle={() => toggleSection('useconomics')}
          icon={<DollarSign size={18} />}
        >
          <USEconomicsPanel />
        </CollapsibleContainer>

                <CollapsibleContainer
          title="Yield Curves & Credit Spreads"
          isOpen={openSections.yieldcurves}
          onToggle={() => toggleSection('yieldcurves')}
          icon={<LineChart size={18} />}
        >
          <YieldCurvesPanel />
        </CollapsibleContainer>

        <CollapsibleContainer
          title="Global Indices"
          isOpen={openSections.globalindices}
          onToggle={() => toggleSection('globalindices')}
          icon={<BarChart4 size={18} />}
        >
          <GlobalIndicesPanel />
        </CollapsibleContainer>

        <CollapsibleContainer
          title="Other Assets"
          isOpen={openSections.assets}
          onToggle={() => toggleSection('assets')}
          icon={<Wallet size={18} />}
        >
          <AssetsPanel />
        </CollapsibleContainer>

        <CollapsibleContainer
          title="FX Rates"
          isOpen={openSections.fxrates}
          onToggle={() => toggleSection('fxrates')}
          icon={<RefreshCcw size={18} />}
        >
          <FXRatesPanel />
        </CollapsibleContainer>
      </main>
    </div>
  );
};

export default Dashboard;