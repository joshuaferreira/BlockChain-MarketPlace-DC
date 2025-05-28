import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';

function App() {
  //state hook for account
  const [account, setAccount] = useState(null);

  //empty parameters, means it is executed when the browser finsishes loading
  useEffect(() => {
    const connectToMetaMask = async () => {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert('MetaMask is not installed! Please install it to use this app.');
        return;
      }

      // Check if it's actually MetaMask
      if (!window.ethereum.isMetaMask) {
        alert('We detected an Ethereum provider, but it might not be MetaMask.');
        return;
      }

      try {
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          alert(`Connected successfully! Account: ${accounts[0]}`);
        } else {
          alert('No accounts found. Please create or import an account in MetaMask.');
        }
      } catch (error) {
        // User rejected the connection request
        if (error.code === 4001) {
          alert('You declined the connection request. Please connect to continue.');
        } else {
          alert(`Error connecting to MetaMask: ${error.message}`);
        }
      }
    };

    //function called when loaded
    connectToMetaMask();
  }, []); //no parameters

  useEffect(() => {
    if (!window.ethereum) return;
  
    const handleChainChanged = (chainId) => {
      console.log('Chain changed to:', chainId);
      // Consider more graceful handling than reload:
      window.location.reload();
    };
  
    const handleAccountsChanged = (accounts) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        console.log('User disconnected all accounts');
      }
      window.location.reload();
    };
  
    // Add listeners
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);
  
    // Cleanup function
    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div>
      {account ? (
        <p>Connected account: {account}</p>
      ) : (
        <p>Not connected to MetaMask</p>
      )}
    </div>
  );
}

export default App;
