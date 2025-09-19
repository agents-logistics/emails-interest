'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FaExclamationCircle } from 'react-icons/fa';

type ContentAreaProps = {
  runid: string;
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type RunData = {
  rowId: string;
  customerName: string;
  totalPaid: number;
  date: string;
  documentNumber: string;
  matchedTestName: string;
  physicianReferred: string | null;
  hospital: string | null;
  agents: string | null;
};

type TestData = {
  test_name: string;
  credit_card_fee_per_case: number | null;
  lab_fee_per_case: number | null;
  international_shipping_fee_per_case: number | null;
  blood_drawing_fee: number | null;
  biopsy_retrieval_fee_per_case: number | null;
  urine_collection_fee: number | null;
  physician_fee: number | null;
  min_gross_percentage: number | null;
  max_gross_percentage: number | null;
};

type Agent = {
  agentId: string;
  agentName: string;
};

const ReportContentArea: FC<ContentAreaProps> = ({ runid, onShowNavigation, showNavigation }) => {
  const [runData, setRunData] = useState<RunData[]>([]);
  const [testData, setTestData] = useState<{ [key: string]: TestData }>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [totalShippingCost, setTotalShippingCost] = useState<number>(0);
  const [totalPhysicianCommission, setTotalPhysicianCommission] = useState<number>(0);
  const [totalBloodTakingFee, setTotalBloodTakingFee] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [testsRunData, setTestsRunData] = useState<{ [key: string]: TestData }>({});
  const [missingTests, setMissingTests] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    fetchReportData();
    fetchBonusRunData();
    fetchAgents();
    fetchTestsRunData();
    checkMissingTests();
  }, [runid]);

  const fetchReportData = async () => {
    try {
      const response = await fetch(`/api/getReportData?runId=${runid}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();
      setRunData(data.runData);
      setTestData(
        data.testData.reduce((acc: { [key: string]: TestData }, test: TestData) => {
          acc[test.test_name] = test;
          return acc;
        }, {})
      );
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchBonusRunData = async () => {
    try {
      const response = await fetch(`/api/getBonusRunRunId?runId=${runid}`);
      if (!response.ok) throw new Error('Failed to fetch bonus run data');
      const data = await response.json();
      setTotalShippingCost(data.totalShippingCost || 0);
      setTotalPhysicianCommission(data.physicianCommisionFee || 0);
      setTotalBloodTakingFee(data.totalBloodTakingFee || 0);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`/api/getAgents`);
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchTestsRunData = async () => {
    try {
      const response = await fetch(`/api/testsRunId?runId=${runid}`);
      if (!response.ok) throw new Error('Failed to fetch tests run data');
      const data = await response.json();
      
      const testsRunDataObj = data.reduce((acc: { [key: string]: TestData }, test: TestData) => {
        acc[test.test_name] = test;
        return acc;
      }, {});
      
      setTestsRunData(testsRunDataObj);
    } catch (error: any) {
      console.error('Error fetching tests run data:', error);
    }
  };

  const checkMissingTests = async () => {
    try {
      // Fetch common tests for this run
      const commonTestsResponse = await fetch(`/api/commonTestsForRunId?runId=${runid}`);
      const commonTests = await commonTestsResponse.json();
      
      // Fetch tests that have been added to this run
      const addedTestsResponse = await fetch(`/api/testsRunId?runId=${runid}`);
      const addedTests = await addedTestsResponse.json();
      
      // Check if there are remaining tests that haven't been added
      const remainingTests = commonTests.filter((test: any) => 
        !addedTests.some((addedTest: any) => addedTest.test_name === test.test_name)
      );
      
      setMissingTests(remainingTests.length > 0);
    } catch (error) {
      console.error('Error checking for missing tests:', error);
    }
  };

  const handleNavigateToMatchTests = () => {
    router.push(`/matchtests/${runid}`);
  };

  const getAgentNames = (agentIds: string | null) => {
    if (!agentIds) return '';
    const ids = agentIds.split(',');
    const names = ids.map((id) => agents.find((agent) => agent.agentId === id)?.agentName || id);
    return names.join(', ');
  };

  const calculateRevenueWithoutVAT = (totalPaid: number) => totalPaid / 1.18;

  const calculateTestTotals = () => {
    const totals: {
      [key: string]: {
        totalRevenueWithoutVAT: number;
        testsSold: number;
        creditCardCharges: number;
        labFee: number;
        internationalShippingFee: number;
        nationalShippingFee: number;
        physicianCommissionFee: number;
        bloodTakingFee: number;
        bloodDrawingFee: number;
        biopsyRetrievalFee: number;
        urineCollectionFee: number;
        physicianFee: number;
        totalGrossProfit: number;
        grossPercentage: number;
        minGrossPercentage: number | null;
        maxGrossPercentage: number | null;
        isGrossPercentageValid: boolean;
      };
    } = {};

    const nationalShippingFee = totalShippingCost / runData.length;
    const physicianCommissionFee = totalPhysicianCommission / runData.length;
    const bloodTakingFee = totalBloodTakingFee / runData.length;
    console.log(totalBloodTakingFee);
    console.log(runData.length);
    console.log(bloodTakingFee);
    
    console.log(physicianCommissionFee)

    runData.forEach((data) => {
      const testName = data.matchedTestName;
      const test = testData[testName];

      if (!test) return;

      const revenueWithoutVAT = calculateRevenueWithoutVAT(data.totalPaid);
      const creditCardCharges = test.credit_card_fee_per_case || 0;
      const labFee = test.lab_fee_per_case || 0;
      const internationalShippingFee = test.international_shipping_fee_per_case || 0;
      const biopsyRetrievalFee = test.biopsy_retrieval_fee_per_case || 0;

      if (!totals[testName]) {
        totals[testName] = {
          totalRevenueWithoutVAT: 0,
          testsSold: 0,
          creditCardCharges: 0,
          labFee: 0,
          internationalShippingFee: 0,
          nationalShippingFee: 0,
          physicianCommissionFee: 0,
          bloodTakingFee: 0,
          bloodDrawingFee: 0,
          biopsyRetrievalFee: 0,
          urineCollectionFee: 0,
          physicianFee: 0,
          totalGrossProfit: 0,
          grossPercentage: 0,
          minGrossPercentage: null,
          maxGrossPercentage: null,
          isGrossPercentageValid: true,
        };
      }

      totals[testName].totalRevenueWithoutVAT += revenueWithoutVAT;
      totals[testName].testsSold += 1;
      totals[testName].creditCardCharges += creditCardCharges;
      totals[testName].labFee += labFee;
      totals[testName].internationalShippingFee += internationalShippingFee;
      totals[testName].nationalShippingFee += nationalShippingFee;
      totals[testName].biopsyRetrievalFee += biopsyRetrievalFee;
      totals[testName].physicianCommissionFee += physicianCommissionFee;
      totals[testName].bloodTakingFee += bloodTakingFee;

      const totalCost =
        creditCardCharges +
        labFee +
        internationalShippingFee +
        nationalShippingFee +
        physicianCommissionFee + 
        bloodTakingFee +
        biopsyRetrievalFee;
      totals[testName].totalGrossProfit += revenueWithoutVAT - totalCost;
    });

    Object.keys(totals).forEach((testName) => {
      const physicianFee = testData[testName]?.physician_fee || 0;
      totals[testName].physicianFee = physicianFee;
      totals[testName].totalGrossProfit -= physicianFee;
      const bloodDrawingFee = testData[testName]?.blood_drawing_fee || 0;
      totals[testName].bloodDrawingFee = bloodDrawingFee;
      totals[testName].totalGrossProfit -= bloodDrawingFee;

      const urineCollectionFee = testData[testName]?.urine_collection_fee || 0;
      totals[testName].urineCollectionFee = urineCollectionFee;
      totals[testName].totalGrossProfit -= urineCollectionFee;

      // Calculate gross percentage
      const grossPercentage = (totals[testName].totalGrossProfit / totals[testName].totalRevenueWithoutVAT) * 100;
      totals[testName].grossPercentage = grossPercentage;
      
      // Get min and max gross percentage values - first check run-specific values, then fall back to common test values
      const minGrossPercentage = testsRunData[testName]?.min_gross_percentage ?? testData[testName]?.min_gross_percentage ?? null;
      const maxGrossPercentage = testsRunData[testName]?.max_gross_percentage ?? testData[testName]?.max_gross_percentage ?? null;
      
      totals[testName].minGrossPercentage = minGrossPercentage;
      totals[testName].maxGrossPercentage = maxGrossPercentage;
      
      // Validate if gross percentage is within the acceptable range
      totals[testName].isGrossPercentageValid = 
        (minGrossPercentage === null || grossPercentage >= minGrossPercentage) && 
        (maxGrossPercentage === null || grossPercentage <= maxGrossPercentage);
    });

    return totals;
  };

  const handleDownloadExcel = () => {
    const testTotals = calculateTestTotals();
  
    const excelData: any[] = [];
  
    Object.entries(testTotals).forEach(([testName, totals]) => {
      // Add a header row for the test name
      excelData.push([{ v: `Test: ${testName}`, s: { font: { bold: true } } }]);
  
      // Add headers for each test group
      excelData.push([
        { v: 'Customer Name', s: { font: { bold: true } } },
        { v: 'Total Paid', s: { font: { bold: true } } },
        { v: 'Total Paid Without VAT', s: { font: { bold: true } } },
        { v: 'Date', s: { font: { bold: true } } },
        { v: 'Document Number', s: { font: { bold: true } } },
        { v: 'Test Name', s: { font: { bold: true } } },
        { v: 'Referring Physician', s: { font: { bold: true } } },
        { v: 'Hospital Name', s: { font: { bold: true } } },
        { v: 'Agent(s)', s: { font: { bold: true } } },
      ]);
  
      // Add rows for each data entry for the test name
      runData
        .filter((data) => data.matchedTestName === testName)
        .forEach((data) => {
          excelData.push([
            data.customerName,
            data.totalPaid.toFixed(2),
            calculateRevenueWithoutVAT(data.totalPaid).toFixed(2),
            new Date(data.date).toLocaleDateString(),
            data.documentNumber,
            data.matchedTestName,
            data.physicianReferred || 'N/A',
            data.hospital || 'N/A',
            getAgentNames(data.agents),
          ]);
        });
  
      // Add a blank row for spacing
      excelData.push([]);
  
      // Add summary header
      excelData.push([{ v: `Summary for ${testName}`, s: { font: { bold: true } } }]);
  
      // Add summary rows
      excelData.push(['Total Revenue Without VAT', totals.totalRevenueWithoutVAT.toFixed(2)]);
      excelData.push(['Total Tests Sold', totals.testsSold]);
      excelData.push(['Total Credit Card Charges', totals.creditCardCharges.toFixed(2)]);
      excelData.push(['Total Lab Fee', totals.labFee.toFixed(2)]);
      excelData.push(['Total International Shipping Fee', totals.internationalShippingFee.toFixed(2)]);
      excelData.push(['Total National Shipping Fee', totals.nationalShippingFee.toFixed(2)]);
      excelData.push(['Total Physician Commision Fee ', totals.physicianCommissionFee.toFixed(2)]);
      excelData.push(['Total Blood Taking Fee', totals.bloodTakingFee.toFixed(2)]);

      excelData.push(['Total Blood Drawing Fee', totals.bloodDrawingFee.toFixed(2)]);
      excelData.push(['Total Biopsy Retrieval Fee', totals.biopsyRetrievalFee.toFixed(2)]);
      excelData.push(['Total Urine Collection Fee', totals.urineCollectionFee.toFixed(2)]);
      excelData.push(['Total Physician Fee', totals.physicianFee.toFixed(2)]);
      excelData.push(['Total Gross Profit', totals.totalGrossProfit.toFixed(2)]);
      
      // Add gross percentage with validation
      const grossPercentageValue = totals.grossPercentage.toFixed(2) + ' %';
      const grossPercentageRow = [
        'Gross Percentage', 
        { 
          v: grossPercentageValue,
          s: { 
            font: { 
              color: { rgb: totals.isGrossPercentageValid ? "000000" : "FF0000" } 
            } 
          }
        }
      ];
      
      if (totals.minGrossPercentage !== null || totals.maxGrossPercentage !== null) {
        let rangeText = 'Expected range: ';
        if (totals.minGrossPercentage !== null) {
          rangeText += `min ${totals.minGrossPercentage.toFixed(2)}%`;
        }
        if (totals.minGrossPercentage !== null && totals.maxGrossPercentage !== null) {
          rangeText += ' - ';
        }
        if (totals.maxGrossPercentage !== null) {
          rangeText += `max ${totals.maxGrossPercentage.toFixed(2)}%`;
        }
        grossPercentageRow.push(rangeText);
      }
      
      excelData.push(grossPercentageRow);
  
      // Add a blank row to separate groups
      excelData.push([]);
    });
  
    // Create the worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Customer Name
      { wch: 15 }, // Total Paid
      { wch: 20 }, // Total Paid Without VAT
      { wch: 12 }, // Date
      { wch: 18 }, // Document Number
      { wch: 25 }, // Test Name
      { wch: 30 }, // Referring Physician
      { wch: 30 }, // Hospital Name
      { wch: 20 }, // Agent(s)
    ];
  
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Report');
  
    // Write the Excel file
    XLSX.writeFile(workbook, `run_report_${runid}.xlsx`);
  };

  const handleDownloadConsolidatedReport = () => {
    const testTotals = calculateTestTotals();
    
    // Define categories for consolidation
    const categories = ['Decipher', 'Signatera', 'Caris', 'BCI', '4K Score', 'CxBladder'];
    
    // Create consolidated data structure
    const consolidatedData: {
      [key: string]: {
        testsSold: number;
        totalWithoutVAT: number;
      }
    } = {};
    
    // Initialize categories
    categories.forEach(category => {
      consolidatedData[category] = {
        testsSold: 0,
        totalWithoutVAT: 0
      };
    });
    
    // Add "All remaining tests" category
    consolidatedData['All remaining tests'] = {
      testsSold: 0,
      totalWithoutVAT: 0
    };
    
    // Process and consolidate each test
    Object.entries(testTotals).forEach(([testName, totals]) => {
      // Check which category this test belongs to
      let assigned = false;
      
      // First check for Signatera and Caris (anywhere in the name)
      if (testName.includes('Signatera')) {
        consolidatedData['Signatera'].testsSold += totals.testsSold;
        consolidatedData['Signatera'].totalWithoutVAT += totals.totalRevenueWithoutVAT;
        assigned = true;
      } else if (testName.includes('Caris')) {
        consolidatedData['Caris'].testsSold += totals.testsSold;
        consolidatedData['Caris'].totalWithoutVAT += totals.totalRevenueWithoutVAT;
        assigned = true;
      } else {
        // Then check other specific categories (exact match)
        for (const category of categories) {
          if (category !== 'Signatera' && category !== 'Caris' && testName === category) {
            consolidatedData[category].testsSold += totals.testsSold;
            consolidatedData[category].totalWithoutVAT += totals.totalRevenueWithoutVAT;
            assigned = true;
            break;
          }
        }
      }
      
      // If not assigned to any specific category, add to "All remaining tests"
      if (!assigned) {
        consolidatedData['All remaining tests'].testsSold += totals.testsSold;
        consolidatedData['All remaining tests'].totalWithoutVAT += totals.totalRevenueWithoutVAT;
      }
    });
    
    // Convert the consolidated object to array format for Excel
    const reportData = Object.entries(consolidatedData).map(([category, data]) => ({
      testName: category,
      testsSold: data.testsSold,
      totalWithoutVAT: data.totalWithoutVAT
    }));
    
    // Calculate totals for the summary row
    const totalTestsSold = reportData.reduce((sum, item) => sum + item.testsSold, 0);
    const totalWithoutVAT = reportData.reduce((sum, item) => sum + item.totalWithoutVAT, 0);
    
    // Prepare Excel data
    const excelData: any[] = [];
    
    // Calculate raw total directly from testTotals for sanity check
    const rawTotalWithoutVAT = Object.values(testTotals).reduce(
      (sum, test) => sum + test.totalRevenueWithoutVAT, 
      0
    );
    
    // Add title and sanity check
    excelData.push([{ v: 'Consolidated Report', s: { font: { bold: true, sz: 14 } } }]);
    excelData.push([
      { v: 'Sanity Check - Total Revenue Without VAT:', s: { font: { bold: true } } },
      { v: rawTotalWithoutVAT.toFixed(2), t: 'n' }
    ]);
    excelData.push([]);
    
    // Add headers
    excelData.push([
      { v: 'Test Name', s: { font: { bold: true } } },
      { v: 'Tests Sold', s: { font: { bold: true } } },
      { v: 'Total Without VAT', s: { font: { bold: true } } }
    ]);
    
    // Add data rows
    reportData.forEach(item => {
      excelData.push([
        item.testName,
        item.testsSold,
        { v: item.totalWithoutVAT.toFixed(2), t: 'n' }
      ]);
    });
    
    // Add a blank row
    excelData.push([]);
    
    // Add totals row
    excelData.push([
      { v: 'TOTAL', s: { font: { bold: true } } },
      { v: totalTestsSold, s: { font: { bold: true } } },
      { v: totalWithoutVAT.toFixed(2), t: 'n', s: { font: { bold: true } } }
    ]);
    
    // Create the worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Test Name
      { wch: 15 }, // Tests Sold
      { wch: 20 }, // Total Without VAT
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidated Report');
    
    // Write the Excel file
    XLSX.writeFile(workbook, `consolidated_report_${runid}.xlsx`);
  };

  const generateCSVContent = () => {
    const csvHeaders = [
      'Customer Name',
      'Total Paid',
      'Total Paid Without VAT',
      'Date',
      'Document Number',
      'Test Name',
      'Referring Physician',
      'Hospital Name',
      'Agent(s)',
    ];

    const csvRows = runData.map((data) => [
      data.customerName,
      data.totalPaid.toFixed(2),
      calculateRevenueWithoutVAT(data.totalPaid).toFixed(2),
      new Date(data.date).toLocaleDateString(),
      data.documentNumber,
      data.matchedTestName,
      data.physicianReferred || '',
      data.hospital || '',
      getAgentNames(data.agents),
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  };
  const handleDownloadCSV = () => {
    const csvContent = generateCSVContent();
    const bom = '\uFEFF'; 
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `run_report_${runid}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  const renderTestTotalsTable = () => {
    const testTotals = calculateTestTotals();

    return (
      <div>
        {Object.entries(testTotals).map(([testName, totals]) => (
          <div key={testName} className="mb-4">
            <h3 className="text-lg font-bold mb-2">Test: {testName}</h3>
            <table className="table-auto w-full mb-4">
              <thead>
                <tr>
                  <th className="px-4 py-2">Customer Name</th>
                  <th className="px-4 py-2">Total Paid</th>
                  <th className="px-4 py-2">Total Paid Without VAT</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Document Number</th>
                  <th className="px-4 py-2">Test Name</th>
                  <th className="px-4 py-2">Referring Physician</th>
                  <th className="px-4 py-2">Hospital Name</th>
                  <th className="px-4 py-2">Agent(s)</th>
                </tr>
              </thead>
              <tbody>
                {runData
                  .filter((data) => data.matchedTestName === testName)
                  .map((data) => (
                    <tr key={data.rowId}>
                      <td className="border px-4 py-2">{data.customerName}</td>
                      <td className="border px-4 py-2">{data.totalPaid}</td>
                      <td className="border px-4 py-2">{calculateRevenueWithoutVAT(data.totalPaid).toFixed(2)}</td>
                      <td className="border px-4 py-2">{new Date(data.date).toLocaleDateString()}</td>
                      <td className="border px-4 py-2">{data.documentNumber}</td>
                      <td className="border px-4 py-2">{data.matchedTestName}</td>
                      <td className="border px-4 py-2">{data.physicianReferred}</td>
                      <td className="border px-4 py-2">{data.hospital}</td>
                      <td className="border px-4 py-2">{getAgentNames(data.agents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <h4 className="text-md font-bold mb-2">Summary for {testName}</h4>
            <p>Total Revenue Without VAT: {totals.totalRevenueWithoutVAT.toFixed(2)}</p>
            <p>Total Tests Sold: {totals.testsSold}</p>
            <p>Total Credit Card Charges: {totals.creditCardCharges.toFixed(2)}</p>
            <p>Total Lab Fee: {totals.labFee.toFixed(2)}</p>
            <p>Total International Shipping Fee: {totals.internationalShippingFee.toFixed(2)}</p>
            <p>Total National Shipping Fee: {totals.nationalShippingFee.toFixed(2)}</p>
            <p>Total Physician Commission Fee: {totals.physicianCommissionFee.toFixed(2)}</p>
            <p>Total Blood Taking Fee: {totals.bloodTakingFee.toFixed(2)}</p>
            <p>Total Blood Drawing Fee: {totals.bloodDrawingFee.toFixed(2)}</p>
            <p>Total Biopsy Retrieval Fee: {totals.biopsyRetrievalFee.toFixed(2)}</p>
            <p>Total Urine Collection Fee: {totals.urineCollectionFee.toFixed(2)}</p>
            <p>Total Physician Fee: {totals.physicianFee.toFixed(2)}</p>
            <p>Total Gross Profit: {totals.totalGrossProfit.toFixed(2)}</p>
            <p className={!totals.isGrossPercentageValid ? "text-red-500 font-bold" : ""}>
              Gross percentage: {totals.grossPercentage.toFixed(2)}% 
              {(totals.minGrossPercentage !== null || totals.maxGrossPercentage !== null) && (
                <span className="ml-2 text-sm text-gray-600">
                  (Expected range: 
                  {totals.minGrossPercentage !== null && ` min ${totals.minGrossPercentage.toFixed(2)}%`}
                  {totals.minGrossPercentage !== null && totals.maxGrossPercentage !== null && ' -'}
                  {totals.maxGrossPercentage !== null && ` max ${totals.maxGrossPercentage.toFixed(2)}%`}
                  )
                </span>
              )}
            </p>
            {!totals.isGrossPercentageValid && (
              <p className="text-red-500 text-sm">
                Warning: Gross percentage is outside the expected range!
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full`}>
      <div className="w-full flex items-start mb-4">
        {!showNavigation && (
          <div className="">
            <Button onClick={onShowNavigation} className="items-start mr-2 flex-shrink-0 bg-carevox text-white">
              <img src="/images/nav.svg" alt="Icon" className="text-white" width={24} />
            </Button>
          </div>
        )}
      </div>
      
      {missingTests && (
        <Alert variant="destructive" className="mb-4 w-full">
          <FaExclamationCircle className="h-4 w-4" />
          <AlertTitle>Missing Test Details</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>Some test details for this run are incomplete. Please add the missing information before generating reports.</span>
            <Button 
              onClick={handleNavigateToMatchTests} 
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Complete Test Details
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {error && <p className="text-red-500">{error}</p>}
      <div className="w-full mb-4 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Test Report for Run ID: {runid}</h2>
        {renderTestTotalsTable()}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleDownloadConsolidatedReport} className="bg-green-500 text-white">
          Consolidated Report
        </Button>
        <Button onClick={handleDownloadExcel} className="bg-blue-500 text-white">
          Download Excel
        </Button>
      </div>
    </div>
  );
};

export default ReportContentArea;
