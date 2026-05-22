const keys = [
  "AIzaSyBHZV8kbi9x3S30b0d5BfcJM5Hf-DfNKec",
  "AIzaSyDpnNvXcY_Mdr29kZ9JR62z4P1JzugvcNk",
  "AIzaSyCxGoPAxJjmNW0JbPXmEHBLj2wMFFDbeOw"
];

async function testKeys() {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    console.log(`Testing Key ${i + 1}...`);
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${key}`);
      const data = await res.json();
      console.log(`Key ${i + 1} Status:`, res.status);
      if (res.status !== 200) {
        console.log(`Key ${i + 1} Error:`, data.error?.message);
      } else {
        console.log(`Key ${i + 1} works!`);
      }
    } catch (e) {
      console.log(`Key ${i + 1} Fetch Failed:`, e.message);
    }
  }
}
testKeys();
