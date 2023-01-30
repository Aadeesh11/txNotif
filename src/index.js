async function getBalance(address, etherScanApiKey) {
  const response = await fetch(
    //use api.etherscan.io in prod.
    `https://api-goerli.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${etherScanApiKey}`,
  );
  return response.text();
}

module.exports.onRpcRequest = async ({ origin, request }) => {
  let state = await wallet.request({
    method: 'snap_manageState',
    params: ['get'],
  });

  if (!state) {
    state = { book: '', balance: 0.0 };
    // initialize state if empty and set default data
    await wallet.request({
      method: 'snap_manageState',
      params: ['update', state],
    });
  }

  switch (request.method) {
    case 'storeAddress':
      state.book = request.params.addressToStore;
      await wallet.request({
        method: 'snap_manageState',
        params: ['update', state],
      });
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: `Hello, ${origin}!`,
            description: 'no',
            textAreaContent: `Address: ${state.book}\n`,
          },
        ],
      });
    case 'hello':
      //get instant notification if balance is greater than previous on button click.
      const resp = await getBalance(
        state.book,
        'HRFXAVJGIDCB3D1ZY2ZR458EXK2W4M9ERS',
      );
      const resObj = JSON.parse(resp);
      let balance = 0;
      if (resObj['status'] == 1 || resObj['message'] == 'OK') {
        //converting from wei to ether
        balance = parseInt(resObj['result']) / 1000000000000000000.0;
      }
      let oldBalance = state.balance;
      if (balance - oldBalance > 0.0) {
        state.balance = balance;
        await wallet.request({
          method: 'snap_manageState',
          params: ['update', state],
        });
        return wallet.request({
          method: 'snap_notify',
          params: [
            {
              type: 'native',
              message: `Current:${balance}, added:${balance - oldBalance}`,
            },
          ],
        });
      } else {
        return wallet.request({
          method: 'snap_confirm',
          params: [
            {
              prompt: `${state.balance}`,
              description: `${state.book}`,
              textAreaContent: `${resp.substring(0, 1800)}`,
            },
          ],
        });
      }

    default:
      throw new Error('Method not found.');
  }
};

module.exports.onCronjob = async ({ request }) => {
  let state = await wallet.request({
    method: 'snap_manageState',
    params: ['get'],
  });

  if (!state) {
    state = { book: '', balance: 0.0 };
    // initialize state if empty and set default data
    await wallet.request({
      method: 'snap_manageState',
      params: ['update', state],
    });
  }
  switch (request.method) {
    case 'txRecieveJob':
      const resp = await getBalance(
        state.book,
        'HRFXAVJGIDCB3D1ZY2ZR458EXK2W4M9ERS',
      );
      const resObj = JSON.parse(resp);
      let balance = 0;
      if (resObj['status'] == 1 && resObj['message'] == 'OK') {
        //converting from wei to ether
        balance = parseInt(resObj['result']) / 1000000000000000000.0;
      }
      let oldBalance = state.balance;

      state.balance = balance;
      await wallet.request({
        method: 'snap_manageState',
        params: ['update', state],
      });
      if (balance - oldBalance > 0) {
        return wallet.request({
          method: 'snap_notify',
          params: [
            {
              type: 'native',
              message: `Current:${balance}, added:${max(
                balance - oldBalance,
                0,
              )}`,
            },
          ],
        });
      } else {
        return;
      }
    default:
      throw new Error('Method not found.');
  }
};
