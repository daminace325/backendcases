const requests = Array.from({ length: 10 }, () =>
    fetch("http://localhost:3000/api/url/-B2Leb8/increment", {
        method: "POST"
    })
);

const responses = await Promise.all(requests);

console.log("Status codes:", responses.map(r => r.status));