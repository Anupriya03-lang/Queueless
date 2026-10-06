const API = "http://localhost:5000/api";

let currentToken = localStorage.getItem("currentToken");


// ================= LOAD PAGE =================

document.addEventListener("DOMContentLoaded", function () {

    loadBookingStatus();

    loadLiveQueue();

    if (currentToken) {
        updateMyToken();
    }

    setInterval(loadBookingStatus, 5000);

    setInterval(loadLiveQueue, 5000);

    setInterval(updateMyToken, 5000);

});


// ================= BOOKING STATUS =================

async function loadBookingStatus() {

    try {

        const response = await fetch(`${API}/booking-status`);

        const data = await response.json();

        const status = document.getElementById("bookingStatus");

        if (data.open) {

            status.textContent =
                "✓ Booking is OPEN — 8:45 AM to 4:00 PM";

            status.style.background = "#eaf8f5";
            status.style.color = "#0f8178";

        } else {

            status.textContent =
                "✕ Booking is CLOSED — Available from 8:45 AM to 4:00 PM";

            status.style.background = "#ffe8e8";
            status.style.color = "#c0392b";
        }

    } catch (error) {

        console.log("Backend not connected");

        document.getElementById("bookingStatus").textContent =
            "Backend server is not connected";

    }

}


// ================= GET TOKEN =================

async function getToken() {

    const service =
        document.getElementById("service").value;

    const registerNumber =
        document.getElementById("registerNumber").value.trim();


    if (!service) {

        alert("Please select a service.");

        return;
    }


    if (!registerNumber) {

        alert("Please enter your register number.");

        return;
    }


    try {

        const response = await fetch(`${API}/token`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                service: service,
                registerNumber: registerNumber
            })

        });


        const data = await response.json();


        if (!response.ok) {

            alert(data.message || "Unable to generate token.");

            return;
        }


        currentToken = data.token;

        localStorage.setItem(
            "currentToken",
            currentToken
        );


        displayToken(data);

        alert(
            `Token ${data.token} generated successfully!`
        );


        document
            .getElementById("my-token")
            .scrollIntoView({
                behavior: "smooth"
            });


        loadLiveQueue();


    } catch (error) {

        alert(
            "Cannot connect to backend server.\n\n" +
            "Please start your Node.js server."
        );

        console.error(error);

    }

}


// ================= DISPLAY TOKEN =================

function displayToken(data) {

    document
        .getElementById("noToken")
        .classList.add("hidden");


    document
        .getElementById("tokenCard")
        .classList.remove("hidden");


    document
        .getElementById("tokenNumber")
        .textContent = data.token;


    document
        .getElementById("tokenService")
        .textContent = data.service;


    document
        .getElementById("bookingTime")
        .textContent =
        formatDate(data.createdAt);


    document
        .getElementById("validUntil")
        .textContent =
        formatDate(data.validUntil);


    document
        .getElementById("peopleAhead")
        .textContent =
        data.peopleAhead ?? 0;


    updateTokenStatus(data.status);

    updateCountdown(data.validUntil);

}


// ================= UPDATE MY TOKEN =================

async function updateMyToken() {

    if (!currentToken) {
        return;
    }


    try {

        const response =
            await fetch(`${API}/token/${currentToken}`);


        if (!response.ok) {

            localStorage.removeItem("currentToken");

            currentToken = null;

            document
                .getElementById("tokenCard")
                .classList.add("hidden");

            document
                .getElementById("noToken")
                .classList.remove("hidden");

            return;
        }


        const data = await response.json();

        displayToken(data);

    } catch (error) {

        console.log("Unable to update token.");

    }

}


// ================= TOKEN STATUS =================

function updateTokenStatus(status) {

    const element =
        document.getElementById("tokenStatus");


    element.textContent = status;


    element.className =
        "status " +
        status.toLowerCase();

}


// ================= COUNTDOWN =================

function updateCountdown(validUntil) {

    const countdown =
        document.getElementById("countdown");


    function calculate() {

        const now = new Date();

        const end =
            new Date(validUntil);

        const difference =
            end - now;


        if (difference <= 0) {

            countdown.textContent =
                "Expired";

            countdown.style.color =
                "#c0392b";

            return;
        }


        const minutes =
            Math.floor(
                difference / 1000 / 60
            );


        const seconds =
            Math.floor(
                (difference / 1000) % 60
            );


        countdown.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;


        countdown.style.color =
            "#0f8178";
    }


    calculate();

    setInterval(calculate, 1000);

}


// ================= CANCEL TOKEN =================

async function cancelToken() {

    if (!currentToken) {
        return;
    }


    const confirmCancel =
        confirm(
            "Are you sure you want to cancel your token?"
        );


    if (!confirmCancel) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API}/token/${currentToken}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Unable to cancel token."
            );

            return;
        }


        alert("Token cancelled successfully.");


        localStorage.removeItem("currentToken");

        currentToken = null;


        document
            .getElementById("tokenCard")
            .classList.add("hidden");


        document
            .getElementById("noToken")
            .classList.remove("hidden");


        loadLiveQueue();


    } catch (error) {

        alert("Backend connection error.");

    }

}


// ================= DOWNLOAD TOKEN =================

async function downloadToken() {

    if (!currentToken) {

        alert("No active token.");

        return;
    }


    try {

        const response =
            await fetch(
                `${API}/token/${currentToken}`
            );


        const data =
            await response.json();


        const text =
`====================================
          QUEUELESS
     COLLEGE DIGITAL QUEUE
====================================

TOKEN NUMBER
${data.token}

SERVICE
${data.service}

BOOKING TIME
${formatDate(data.createdAt)}

VALID UNTIL
${formatDate(data.validUntil)}

PEOPLE AHEAD
${data.peopleAhead ?? 0}

STATUS
${data.status}

====================================
Please reach the service counter
before your token expires.

Booking Time: 8:45 AM - 4:00 PM
Token Validity: 20 Minutes
====================================`;


        const blob =
            new Blob(
                [text],
                { type: "text/plain" }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        link.href = url;

        link.download =
            `${data.token}-Queueless.txt`;


        link.click();


        URL.revokeObjectURL(url);


    } catch (error) {

        alert("Unable to download token.");

    }

}


// ================= LIVE QUEUE =================

async function loadLiveQueue() {

    try {

        const response =
            await fetch(`${API}/live-queue`);


        const data =
            await response.json();


        document
            .getElementById("currentToken")
            .textContent =
            data.currentToken || "--";


        document
            .getElementById("waitingCount")
            .textContent =
            data.waitingCount || 0;


        document
            .getElementById("completedCount")
            .textContent =
            data.completedCount || 0;


    } catch (error) {

        console.log("Live queue unavailable.");

    }

}


// ================= ADMIN LOGIN =================

async function adminLogin() {

    const username =
        document
            .getElementById("adminUsername")
            .value.trim();


    const password =
        document
            .getElementById("adminPassword")
            .value.trim();


    if (!username || !password) {

        document
            .getElementById("adminMessage")
            .textContent =
            "Enter username and password.";

        return;
    }


    try {

        const response =
            await fetch(`${API}/admin/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username: username,
                    password: password
                })

            });


        const data =
            await response.json();


        if (!response.ok) {

            document
                .getElementById("adminMessage")
                .textContent =
                data.message || "Login failed.";

            return;
        }


        document
            .getElementById("adminMessage")
            .textContent =
            "Login successful!";


        document
            .getElementById("adminDashboard")
            .classList.remove("hidden");


        loadAdminTokens();


    } catch (error) {

        document
            .getElementById("adminMessage")
            .textContent =
            "Backend server is not connected.";

    }

}


// ================= ADMIN TOKENS =================

async function loadAdminTokens() {

    try {

        const response =
            await fetch(`${API}/admin/tokens`);


        const tokens =
            await response.json();


        const tbody =
            document.getElementById(
                "adminTableBody"
            );


        tbody.innerHTML = "";


        tokens.forEach(token => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <strong>${token.token}</strong>
                </td>

                <td>
                    ${token.registerNumber}
                </td>

                <td>
                    ${token.service}
                </td>

                <td>
                    ${formatDate(token.createdAt)}
                </td>

                <td>
                    ${token.status}
                </td>

                <td>

                    <button
                        class="action-btn complete-btn"
                        onclick="adminAction('${token.token}', 'complete')"
                    >
                        Complete
                    </button>

                    <button
                        class="action-btn skip-btn"
                        onclick="adminAction('${token.token}', 'skip')"
                    >
                        Skip
                    </button>

                </td>

            `;


            tbody.appendChild(row);

        });


    } catch (error) {

        console.log(
            "Unable to load admin tokens."
        );

    }

}


// ================= CALL NEXT =================

async function callNext() {

    try {

        const response =
            await fetch(`${API}/admin/next`, {

                method: "POST"

            });


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "No token available."
            );

            return;
        }


        alert(
            `Now calling ${data.token}`
        );


        loadAdminTokens();

        loadLiveQueue();


    } catch (error) {

        alert("Backend server error.");

    }

}


// ================= ADMIN ACTION =================

async function adminAction(token, action) {

    try {

        const response =
            await fetch(
                `${API}/admin/token/${token}/${action}`,
                {
                    method: "PUT"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(
                data.message ||
                "Action failed."
            );

            return;
        }


        loadAdminTokens();

        loadLiveQueue();


    } catch (error) {

        alert("Backend server error.");

    }

}


// ================= DATE FORMAT =================

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }


    const date =
        new Date(dateString);


    return date.toLocaleString(
        "en-IN",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}