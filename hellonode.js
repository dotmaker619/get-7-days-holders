const Web3 = require("web3");
const axios = require("axios");
const express = require("express");

const ObjectsToCsv = require('objects-to-csv');

const Olympus = require("./abi/Olympus.json");
const {deployedAtBlockNo, launchedAtBlockNo, myApiKey} = require("./static.json")

const rpcURL = "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
const OLYMPUS = "0x18b426813731c144108c6d7faf5ede71a258fd9a";
const web3 = new Web3(rpcURL)

const getLaunchedTimestamp = async ( key, number ) => {
  const response = await axios.get(
      "https://api.bscscan.com/api?apikey=" + key + "&module=block&action=getblockreward&blockno=" + number +"",
  );

  return response.data.result.timeStamp;
}

const getBlockNoByTimeStamp = async ( key, timestamp ) => {
  const response = await axios.get(
      "https://api.bscscan.com/api?apikey=" + key + "&module=block&action=getblocknobytime&timestamp=" + timestamp + "&closest=before"
  )

  return response.data.result;
}

const getListAccount = async ( key, start, end ) => {
  const response = await axios.get(
      "https://api.bscscan.com/api?apikey=" + key + "&module=account&action=tokentx&contractaddress=0x18b426813731C144108c6D7FAf5EdE71a258fD9A&startblock=" + start + "&endblock=" + end + "&sort=asc"
  )

  return response.data.result;
}

const getLists = async (address) => {
	const contract = new web3.eth.Contract(Olympus, OLYMPUS)
	return await contract.methods.balanceOf(address);
}

const detectAddress = async (address) => {
	return await web3.eth.getCode(address);
}

const app = express();
const port = 3000;

//start ---
app.get('/', async function (){
  const lists = [];
  const result = [];
  const launchedTimeStamp = await getLaunchedTimestamp( myApiKey, launchedAtBlockNo );
  const after = Number(launchedTimeStamp) + (3600*24*7);
  const endBlockNo = await getBlockNoByTimeStamp(myApiKey, after);
  const listAccount =  await getListAccount(myApiKey, deployedAtBlockNo, endBlockNo);

  for ( let i = 0; i < listAccount.length; i ++) {
    if (listAccount[i].value > 0) {
        lists.push(listAccount[i].to)
    }
  }

  let arr = lists.filter((element, index) => {
      return lists.indexOf(element) === index;
  });

  for ( let i = 0; i < arr.length; i ++ ) {
    const a = await detectAddress(arr[i])
    if ( a == '0x') {
      const b = await getLists(arr[i]);
      if ( b != '0' && b != null ) {
          result.push(arr[i])
      }
    }
  }
  console.log("This is result---------", result.length);

  const resultData = Object.keys(result).map((key) => [Number(key), result[key]]);

  //create csv
  const csv = new ObjectsToCsv(resultData);
  await csv.toDisk('./list.csv')

});

app.listen(port, () => {
  console.log(`This app listening on port ${port}!`)
});