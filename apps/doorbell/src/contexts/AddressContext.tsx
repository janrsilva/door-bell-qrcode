"use client";

import React, { createContext, useContext, useState } from "react";

export interface AddressData {
  number: string;
  complement?: string;
  street: string;
  neighborhood: string;
  city: string;
  state?: string;
  zipCode?: string;
  uuid?: string;
}

interface AddressContextType {
  addressData: AddressData | null;
  setAddressData: (data: AddressData | null) => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({
  children,
  addressData,
}: {
  children: React.ReactNode;
  addressData: AddressData;
}) {
  const [data, setData] = useState<AddressData | null>(addressData);

  const value: AddressContextType = {
    addressData: data,
    setAddressData: setData,
  };

  return (
    <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
  );
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error("useAddress must be used within an AddressProvider");
  }
  return context;
}
