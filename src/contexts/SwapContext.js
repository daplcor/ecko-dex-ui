import React, { createContext } from 'react';
import Pact from 'pact-lang-api';
import { reduceBalance } from '../utils/reduceBalance';
import { useKaddexWalletContext, useWalletContext, useAccountContext, usePactContext, useWalletConnectContext } from '.';
import { CHAIN_ID, creationTime, NETWORK, NETWORKID, KADDEX_NAMESPACE, NETWORK_VERSION } from '../constants/contextConstants';
import { getPair, getPairAccount, getTokenBalanceAccount } from '../api/pact';
import { mkReq, parseRes } from '../api/utils';

export const SwapContext = createContext();

const BURN_WALLET = "c:KI4cQnLt-DLK31X7mKay1c3DNPr-adIel5op8CkEOYo"; 
const BURN_FEE = 0.01; // 1% burn fee

export const SwapProvider = (props) => {
  const pact = usePactContext();
  const { account, localRes, setLocalRes } = useAccountContext();
  const { isConnected: isKaddexWalletConnected, requestSign: kaddexWalletRequestSign } = useKaddexWalletContext();
  const { pairingTopic: isWalletConnectConnected, requestSignTransaction, sendTransactionUpdateEvent: walletConnectSendTransactionUpdateEvent } = useWalletConnectContext();
  const wallet = useWalletContext();

  const isBurnToken = (tokenAddress) => {
    // return tokenAddress !== 'coin' && tokenAddress.includes('ali2khfkjsdhfjsdhfjsd');

    return tokenAddress !== 'coin' && tokenAddress.includes('n_e309f0fa7cf3a13f93a8da5325cdad32790d2070.heron');
  };

  const calculateBurnAmount = (amount, precision) => {
    return reduceBalance(amount * BURN_FEE, precision);
  };

  const getSwapCaps = (isSwapIn, account, token0, token1, pair) => {
 
    const baseCaps = [
      ...(pact.enableGasStation
        ? [Pact.lang.mkCap('Gas Station', 'free gas', `${KADDEX_NAMESPACE}.gas-station.GAS_PAYER`, ['kaddex-free-gas', { int: 1 }, 1.0])]
        : [Pact.lang.mkCap('gas', 'pay gas', 'coin.GAS')])
    ];

    let burnCaps = [];
    
    // Handle burn fees for token0 (input token)
    if (isBurnToken(token0.address)) {
      const token0Amount = reduceBalance(token0.amount, pact.allTokens[token0.address].precision);
      burnCaps.push(
        Pact.lang.mkCap(
          'burn transfer capability',
          'transfer burn fee',
          `${token0.address}.TRANSFER`,
          [account.account, BURN_WALLET, calculateBurnAmount(token0Amount, pact.allTokens[token0.address].precision)]
        )
      );
    }

    if (isBurnToken(token1.address)) {
      const token1Amount = reduceBalance(token1.amount, pact.allTokens[token1.address].precision);
      burnCaps.push(
        Pact.lang.mkCap(
          'burn transfer capability',
          'transfer burn fee',
          `${token1.address}.TRANSFER`,
          [account.account, BURN_WALLET, calculateBurnAmount(token1Amount, pact.allTokens[token1.address].precision)]
        )
      );
    }

    // Regular swap capabilities
    const swapAmount0 = isSwapIn
      ? reduceBalance(token0.amount, pact.allTokens[token0.address].precision)
      : reduceBalance(token0.amount * (1 + parseFloat(pact.slippage)), pact.allTokens[token0.address].precision);

    const swapAmount1 = isSwapIn
      ? reduceBalance(token1.amount * (1 - parseFloat(pact.slippage)), pact.allTokens[token1.address].precision)
      : reduceBalance(token1.amount, pact.allTokens[token1.address].precision);

    const swapCaps = pact.isMultihopsSwap
      ? [
          Pact.lang.mkCap('transfer capability', 'transfer token in', `${token0.address}.TRANSFER`, [
            account.account,
            pact.multihopsReserves.fromData.pairAccount,
            swapAmount0
          ]),
          Pact.lang.mkCap('transfer capability', 'transfer token in', `${token1.address}.TRANSFER`, [
            account.account,
            pact.multihopsReserves.toData.pairAccount,
            swapAmount1
          ])
        ]
      : [
          Pact.lang.mkCap('transfer capability', 'transfer token in', `${token0.address}.TRANSFER`, [
            account.account,
            pair.account,
            swapAmount0
          ])
        ];

    return [...baseCaps, ...burnCaps, ...swapCaps];
  };

    const swapWallet = async (token0, token1, isSwapIn) => {

      const accountDetails = await getTokenBalanceAccount(token0.address, account.account);
      if (accountDetails.result.status === 'success') {
        const pair = !pact.isMultihopsSwap ? await getPair(token0.address, token1.address) : null;
        const pactTokenArray = pact.isMultihopsSwap ? `${token0.address} coin ${token1.address}` : `${token0.address} ${token1.address}`;
        
        try {

          const hasBurnToken = isBurnToken(token0.address) || isBurnToken(token1.address);

          // Handle burn transfers based on which token is the burn token and swap direction
          const token0BurnTransfer = isBurnToken(token0.address)
          ? `(${token0.address}.transfer ${JSON.stringify(account.account)} ${JSON.stringify(BURN_WALLET)} (read-decimal 'token0BurnAmount))`
          : '';

        const token1BurnTransfer = isBurnToken(token1.address)
          ? `(${token1.address}.transfer ${JSON.stringify(account.account)} ${JSON.stringify(BURN_WALLET)} (read-decimal 'token1BurnAmount))`
          : '';

          const inPactCode = hasBurnToken ? `
          (let (
            (res   
             (${KADDEX_NAMESPACE}.exchange.swap-exact-in
              (read-decimal 'token0Amount)
              (read-decimal 'token1AmountWithSlippage)
              [${pactTokenArray}]
              ${JSON.stringify(account.account)}
              ${JSON.stringify(account.account)}
              (read-keyset 'user-ks)
            ))
          )
            ${token0BurnTransfer}
            ${token1BurnTransfer}  
            res
          )
        ` : `
          (${KADDEX_NAMESPACE}.exchange.swap-exact-in
            (read-decimal 'token0Amount)
            (read-decimal 'token1AmountWithSlippage)
            [${pactTokenArray}]
            ${JSON.stringify(account.account)}
            ${JSON.stringify(account.account)}
            (read-keyset 'user-ks)
          )
        `;

        const outPactCode = hasBurnToken ? `
          (let (
            (res (${KADDEX_NAMESPACE}.exchange.swap-exact-out
              (read-decimal 'token1Amount)
              (read-decimal 'token0AmountWithSlippage)
              [${pactTokenArray}]
              ${JSON.stringify(account.account)}
              ${JSON.stringify(account.account)}
              (read-keyset 'user-ks)
            ))
          )
            ${token0BurnTransfer}
            ${token1BurnTransfer}  
            res
          )
        ` : `
          (${KADDEX_NAMESPACE}.exchange.swap-exact-out
            (read-decimal 'token1Amount)
            (read-decimal 'token0AmountWithSlippage)
            [${pactTokenArray}]
            ${JSON.stringify(account.account)}
            ${JSON.stringify(account.account)}
            (read-keyset 'user-ks)
          )
        `;

          const token0Amount = reduceBalance(token0.amount, pact.allTokens[token0.address].precision);
          const token1Amount = reduceBalance(token1.amount, pact.allTokens[token1.address].precision);

          const envData = {
            'user-ks': accountDetails.result.data.guard,
            token0Amount: token0Amount,
            token1Amount: token1Amount,
            token0AmountWithSlippage: reduceBalance(token0.amount * (1 + parseFloat(pact.slippage)), pact.allTokens[token0.address].precision),
            token1AmountWithSlippage: reduceBalance(token1.amount * (1 - parseFloat(pact.slippage)), pact.allTokens[token1.address].precision),
          };

          // Add burn amounts to envData only if needed
          if (isBurnToken(token0.address)) {
            envData.token0BurnAmount = calculateBurnAmount(token0Amount, pact.allTokens[token0.address].precision);
          }
          if (isBurnToken(token1.address)) {
            envData.token1BurnAmount = calculateBurnAmount(token1Amount, pact.allTokens[token1.address].precision);
          }

          const signCmd = {
            pactCode: isSwapIn ? inPactCode : outPactCode,
            caps: getSwapCaps(isSwapIn, account, token0, token1, pair),
            sender: pact.enableGasStation ? 'kaddex-free-gas' : account.account,
            gasLimit: Number(pact.gasConfiguration.gasLimit),
            gasPrice: parseFloat(pact.gasConfiguration.gasPrice),
            chainId: CHAIN_ID,
            ttl: 600,
            envData,
            signingPubKey: accountDetails.result.data.guard.keys[0],
            networkId: NETWORKID,
            networkVersion: NETWORK_VERSION,
          };
          wallet.setIsWaitingForWalletAuth(true);
          let command = null;
          
          if (isKaddexWalletConnected) {
            const res = await kaddexWalletRequestSign(signCmd);
            command = res.signedCmd;
          } else if (isWalletConnectConnected) {
            const res = await requestSignTransaction(account.account, NETWORKID, {
              code: signCmd.pactCode,
              data: signCmd.envData,
              ...signCmd,
            });
            if (res?.status === 'fail') {
              wallet.setWalletError({
                error: true,
                title: 'Wallet Signing Failure',
                content: res.message || 'You cancelled the transaction or did not sign it correctly.',
              });
              return;
            }
            command = res.body;
          } else {
            command = await Pact.wallet.sign(signCmd);
          }

          wallet.setIsWaitingForWalletAuth(false);
          wallet.setWalletSuccess(true);
          pact.setPactCmd(command);
          
          let data = await fetch(`${NETWORK}/api/v1/local`, mkReq(command));
          data = await parseRes(data);

          if (isWalletConnectConnected) {
            await walletConnectSendTransactionUpdateEvent(NETWORKID, data);
          }
          
          setLocalRes(data);
          return data;
        } catch (e) {
          if (e.message.includes('Failed to fetch'))
            wallet.setWalletError({
              error: true,
              title: 'No Wallet',
              content: 'Please make sure you open and login to your wallet.',
            });
          else
            wallet.setWalletError({
              error: true,
              title: 'Wallet Signing Failure',
              content: 'You cancelled the transaction or did not sign it correctly. Please make sure you sign with the keys of the account linked in Mercatus.',
            });
          console.log(e);
        }
      } else {
        wallet.setWalletError({
          error: true,
          title: 'Invalid Action',
          content: `You cannot perform this action with this account. Make sure you have the selected token on chain ${CHAIN_ID}`,
        });
      }
    };

  return (
    <SwapContext.Provider
      value={{
        getPairAccount,
        swapWallet,
        localRes,
        mkReq,
        parseRes,
      }}
    >
      {props.children}
    </SwapContext.Provider>
  );
};

export const SwapConsumer = SwapContext.Consumer;

