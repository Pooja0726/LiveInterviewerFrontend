const test = async () => {
  try {
    const res = await fetch('http://api.paiza.io/runners/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: 'print("Hello world!")',
        language: 'python3',
        api_key: 'guest'
      })
    });
    const data = await res.json();
    console.log('Create:', data);
    
    if (data.id) {
      await new Promise(r => setTimeout(r, 2000));
      const getRes = await fetch(`http://api.paiza.io/runners/get_details?id=${data.id}&api_key=guest`);
      const getData = await getRes.json();
      console.log('Get:', getData);
    }
  } catch (e) {
    console.error(e);
  }
};
test();
