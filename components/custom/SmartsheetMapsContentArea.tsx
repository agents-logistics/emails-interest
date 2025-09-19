'use client';
import styles from '@/styles/ContentArea.module.css';
import React, { FC, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ContentAreaProps = {
  onShowNavigation: () => void;
  showNavigation: boolean;
};

type SmartsheetMapping = {
  smartsheetId: string;
  customerName?: string;
  testName?: string;
  testDetails?: string;
  physicianName?: string;
  hospitalName?: string;
  signedOrderDate?: string;
  defaultCustomerName?: string;
  defaultTestName?: string;
  defaultTestDetails?: string;
  defaultPhysicianName?: string;
  defaultHospitalName?: string;
  defaultSignedOrderDate?: string;
  documentNumber?: string;
  defaultDocumentNumber?: string;
};

const SmartsheetMapsContentArea: FC<ContentAreaProps> = ({ onShowNavigation, showNavigation }) => {
  const [smartsheetMappings, setSmartsheetMappings] = useState<SmartsheetMapping[]>([]);
  const [formData, setFormData] = useState<Partial<SmartsheetMapping>>({
    smartsheetId: '',
    customerName: '',
    testName: '',
    testDetails: '',
    physicianName: '',
    hospitalName: '',
    signedOrderDate: '',
    defaultCustomerName: '',
    defaultTestName: '',
    defaultTestDetails: '',
    defaultPhysicianName: '',
    defaultHospitalName: '',
    defaultSignedOrderDate: '',
    documentNumber: '',
    defaultDocumentNumber: '',
  });
  const [editData, setEditData] = useState<Partial<SmartsheetMapping> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  useEffect(() => {
    fetchSmartsheetMappings();
  }, []);

  const fetchSmartsheetMappings = async () => {
    try {
      const response = await fetch('/api/smartsheetMappings');
      const data = await response.json();
      setSmartsheetMappings(data);
    } catch (error) {
      console.error('Error fetching smartsheet mappings:', error);
    }
  };

  const handleAddMapping = async () => {
    try {
      const response = await fetch('/api/smartsheetMappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const newMapping = await response.json();
        setSmartsheetMappings([...smartsheetMappings, newMapping]);
        setFormData({
          smartsheetId: '',
          customerName: '',
          testName: '',
          testDetails: '',
          physicianName: '',
          hospitalName: '',
          signedOrderDate: '',
          defaultCustomerName: '',
          defaultTestName: '',
          defaultTestDetails: '',
          defaultPhysicianName: '',
          defaultHospitalName: '',
          defaultSignedOrderDate: '',
          documentNumber: '',
          defaultDocumentNumber: '',
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add mapping');
      }
    } catch (error) {
      console.error('Error adding mapping:', error);
      setError('Failed to add mapping');
    }
  };

  const handleDeleteMapping = async (smartsheetId: string) => {
    try {
      const response = await fetch('/api/smartsheetMappings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smartsheetId }),
      });
      if (response.ok) {
        setSmartsheetMappings(smartsheetMappings.filter((mapping) => mapping.smartsheetId !== smartsheetId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      setError('Failed to delete mapping');
    }
  };

  const handleEditMapping = async () => {
    console.log("Here to edit mapping");
    if (!editData) return;

    try {
      const response = await fetch('/api/updateSmartsheetMapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ smartsheetId: editData.smartsheetId, updateData: editData }),
      });
      if (response.ok) {
        const updatedMapping = await response.json();
        setSmartsheetMappings(smartsheetMappings.map(mapping => 
          mapping.smartsheetId === updatedMapping.smartsheetId ? updatedMapping : mapping
        ));
        setEditData(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to edit mapping');
      }
    } catch (error) {
      console.error('Error editing mapping:', error);
      setError('Failed to edit mapping');
    }
  };

  return (
    <div className={`${styles.customRounded} flex flex-col items-center p-4 bg-white shadow-lg rounded-lg w-full h-full`}>
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center">
          {!showNavigation && (
            <Button onClick={onShowNavigation} className="mr-2 flex-shrink-0 bg-carevox text-white">
              <img src="/images/nav.svg" alt="Icon" className="text-white" width={24} />  
            </Button>
          )}
          <h1 className="text-2xl font-bold">Smartsheet Mappings</h1>
        </div>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)} 
          className="flex items-center gap-2 bg-carevox text-white"
        >
          {showAddForm ? <FaEyeSlash className="mr-1" /> : <FaEye className="mr-1" />}
          {showAddForm ? "Hide Form" : "Show Add Form"}
        </Button>
      </div>

      {error && <p className="text-red-500 w-full mb-4">{error}</p>}

      {showAddForm && (
        <div className="w-full mb-6 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-bold mb-4">Add Smartsheet Mapping</h2>
          <form className="grid grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); handleAddMapping(); }}>
            <div className="col-span-2">
              <label htmlFor="smartsheetId">Smartsheet ID</label>
              <input
                id="smartsheetId"
                type="text"
                placeholder="Smartsheet ID"
                value={formData.smartsheetId}
                onChange={(e) => setFormData({ ...formData, smartsheetId: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="customerName">Customer Name</label>
              <input
                id="customerName"
                type="text"
                placeholder="Customer Name"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultCustomerName">Default Customer Name</label>
              <input
                id="defaultCustomerName"
                type="text"
                placeholder="Default Customer Name"
                value={formData.defaultCustomerName}
                onChange={(e) => setFormData({ ...formData, defaultCustomerName: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="testName">Test Name</label>
              <input
                id="testName"
                type="text"
                placeholder="Test Name"
                value={formData.testName}
                onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultTestName">Default Test Name</label>
              <input
                id="defaultTestName"
                type="text"
                placeholder="Default Test Name"
                value={formData.defaultTestName}
                onChange={(e) => setFormData({ ...formData, defaultTestName: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="testDetails">Test Details</label>
              <input
                id="testDetails"
                type="text"
                placeholder="Test Details"
                value={formData.testDetails}
                onChange={(e) => setFormData({ ...formData, testDetails: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultTestDetails">Default Test Details</label>
              <input
                id="defaultTestDetails"
                type="text"
                placeholder="Default Test Details"
                value={formData.defaultTestDetails}
                onChange={(e) => setFormData({ ...formData, defaultTestDetails: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="physicianName">Physician Name</label>
              <input
                id="physicianName"
                type="text"
                placeholder="Physician Name"
                value={formData.physicianName}
                onChange={(e) => setFormData({ ...formData, physicianName: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultPhysicianName">Default Physician Name</label>
              <input
                id="defaultPhysicianName"
                type="text"
                placeholder="Default Physician Name"
                value={formData.defaultPhysicianName}
                onChange={(e) => setFormData({ ...formData, defaultPhysicianName: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="hospitalName">Hospital Name</label>
              <input
                id="hospitalName"
                type="text"
                placeholder="Hospital Name"
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultHospitalName">Default Hospital Name</label>
              <input
                id="defaultHospitalName"
                type="text"
                placeholder="Default Hospital Name"
                value={formData.defaultHospitalName}
                onChange={(e) => setFormData({ ...formData, defaultHospitalName: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="signedOrderDate">Signed Order Date</label>
              <input
                id="signedOrderDate"
                type="text"
                placeholder="Signed Order Date"
                value={formData.signedOrderDate}
                onChange={(e) => setFormData({ ...formData, signedOrderDate: e.target.value })}
                className="border p-2 w-full"
                
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultSignedOrderDate">Default Signed Order Date</label>
              <input
                id="defaultSignedOrderDate"
                type="text"
                placeholder="Default Signed Order Date"
                value={formData.defaultSignedOrderDate}
                onChange={(e) => setFormData({ ...formData, defaultSignedOrderDate: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="documentNumber">Document Number</label>
              <input
                id="documentNumber"
                type="text"
                placeholder="Document Number"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="defaultDocumentNumber">Default Document Number</label>
              <input
                id="defaultDocumentNumber"
                type="text"
                placeholder="Default Document Number"
                value={formData.defaultDocumentNumber}
                onChange={(e) => setFormData({ ...formData, defaultDocumentNumber: e.target.value })}
                className="border p-2 w-full"
              />
            </div>
            <div className="col-span-2 mt-4">
              <Button type="submit" className="bg-carevox text-white p-2 w-full">Add Mapping</Button>
            </div>
          </form>
        </div>
      )}

      <div className="w-full overflow-y-auto flex-grow">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">ID</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Customer Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Customer Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Test Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Test Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Test Details</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Test Details</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Physician Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Physician Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Hospital Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Hospital Name</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Signed Order Date</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Signed Order Date</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Document Number</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Default Document Number</th>
                <th className="px-4 py-2 sticky top-0 bg-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {smartsheetMappings.map((mapping) => (
                <tr key={mapping.smartsheetId}>
                  <td className="border px-4 py-2">{mapping.smartsheetId}</td>
                  <td className="border px-4 py-2">{mapping.customerName}</td>
                  <td className="border px-4 py-2">{mapping.defaultCustomerName}</td>
                  <td className="border px-4 py-2">{mapping.testName}</td>
                  <td className="border px-4 py-2">{mapping.defaultTestName}</td>
                  <td className="border px-4 py-2">{mapping.testDetails}</td>
                  <td className="border px-4 py-2">{mapping.defaultTestDetails}</td>
                  <td className="border px-4 py-2">{mapping.physicianName}</td>
                  <td className="border px-4 py-2">{mapping.defaultPhysicianName}</td>
                  <td className="border px-4 py-2">{mapping.hospitalName}</td>
                  <td className="border px-4 py-2">{mapping.defaultHospitalName}</td>
                  <td className="border px-4 py-2">{mapping.signedOrderDate}</td>
                  <td className="border px-4 py-2">{mapping.defaultSignedOrderDate}</td>
                  <td className="border px-4 py-2">{mapping.documentNumber}</td>
                  <td className="border px-4 py-2">{mapping.defaultDocumentNumber}</td>
                  <td className="border px-4 py-2 flex space-x-2">
                    <Button onClick={() => setEditData(mapping)} className="bg-yellow-500 text-white">
                      Edit
                    </Button>
                    <Button onClick={() => handleDeleteMapping(mapping.smartsheetId)} className="bg-red-500 text-white">
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editData && (
        <Dialog open={Boolean(editData)} onOpenChange={() => setEditData(null)}>
          <DialogTrigger asChild>
            <div />
          </DialogTrigger>
          <DialogContent className='overflow-y-auto max-h-[80vh]'>
            <DialogHeader>
              <DialogTitle>Edit Smartsheet Mapping</DialogTitle>
              <DialogDescription>
                Make changes to the selected smartsheet mapping.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleEditMapping(); }}>
              <label htmlFor="smartsheetId">Smartsheet ID</label>
              <input
                id="smartsheetId"
                type="text"
                placeholder="Smartsheet ID"
                value={editData.smartsheetId}
                readOnly
                className="border p-2 w-full"
              />
              <label htmlFor="customerName">Customer Name</label>
              <input
                id="customerName"
                type="text"
                placeholder="Customer Name"
                value={editData.customerName || ''}
                onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultCustomerName">Default Customer Name</label>
              <input
                id="defaultCustomerName"
                type="text"
                placeholder="Default Customer Name"
                value={editData.defaultCustomerName || ''}
                onChange={(e) => setEditData({ ...editData, defaultCustomerName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="testName">Test Name</label>
              <input
                id="testName"
                type="text"
                placeholder="Test Name"
                value={editData.testName || ''}
                onChange={(e) => setEditData({ ...editData, testName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultTestName">Default Test Name</label>
              <input
                id="defaultTestName"
                type="text"
                placeholder="Default Test Name"
                value={editData.defaultTestName || ''}
                onChange={(e) => setEditData({ ...editData, defaultTestName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="testDetails">Test Details</label>
              <input
                id="testDetails"
                type="text"
                placeholder="Test Details"
                value={editData.testDetails || ''}
                onChange={(e) => setEditData({ ...editData, testDetails: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultTestDetails">Default Test Details</label>
              <input
                id="defaultTestDetails"
                type="text"
                placeholder="Default Test Details"
                value={editData.defaultTestDetails || ''}
                onChange={(e) => setEditData({ ...editData, defaultTestDetails: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="physicianName">Physician Name</label>
              <input
                id="physicianName"
                type="text"
                placeholder="Physician Name"
                value={editData.physicianName || ''}
                onChange={(e) => setEditData({ ...editData, physicianName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultPhysicianName">Default Physician Name</label>
              <input
                id="defaultPhysicianName"
                type="text"
                placeholder="Default Physician Name"
                value={editData.defaultPhysicianName || ''}
                onChange={(e) => setEditData({ ...editData, defaultPhysicianName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="hospitalName">Hospital Name</label>
              <input
                id="hospitalName"
                type="text"
                placeholder="Hospital Name"
                value={editData.hospitalName || ''}
                onChange={(e) => setEditData({ ...editData, hospitalName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultHospitalName">Default Hospital Name</label>
              <input
                id="defaultHospitalName"
                type="text"
                placeholder="Default Hospital Name"
                value={editData.defaultHospitalName || ''}
                onChange={(e) => setEditData({ ...editData, defaultHospitalName: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="signedOrderDate">Signed Order Date</label>
              <input
                id="signedOrderDate"
                type="text"
                placeholder="Signed Order Date"
                value={editData.signedOrderDate || ''}
                onChange={(e) => setEditData({ ...editData, signedOrderDate: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultSignedOrderDate">Default Signed Order Date</label>
              <input
                id="defaultSignedOrderDate"
                type="text"
                placeholder="Default Signed Order Date"
                value={editData.defaultSignedOrderDate || ''}
                onChange={(e) => setEditData({ ...editData, defaultSignedOrderDate: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="documentNumber">Document Number</label>
              <input
                id="documentNumber"
                type="text"
                placeholder="Document Number"
                value={editData.documentNumber || ''}
                onChange={(e) => setEditData({ ...editData, documentNumber: e.target.value })}
                className="border p-2 w-full"
              />
              <label htmlFor="defaultDocumentNumber">Default Document Number</label>
              <input
                id="defaultDocumentNumber"
                type="text"
                placeholder="Default Document Number"
                value={editData.defaultDocumentNumber || ''}
                onChange={(e) => setEditData({ ...editData, defaultDocumentNumber: e.target.value })}
                className="border p-2 w-full"
              />
              <Button type="submit" className="bg-carevox text-white p-2">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SmartsheetMapsContentArea;
