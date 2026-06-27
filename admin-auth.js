import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

export function setupAdminEasterEgg() {
    const titleEl = document.getElementById('eco-title');
    const adminModal = document.getElementById('admin-modal');
    const adminForm = document.getElementById('admin-login-form');
    const cancelAdminBtn = document.getElementById('cancel-admin-btn');
    const adminError = document.getElementById('admin-error');
    
    let tapCount = 0;
    let tapTimer;

    if (titleEl) {
        titleEl.addEventListener('click', () => {
            tapCount++;
            clearTimeout(tapTimer);
            
            if (tapCount >= 5) {
                tapCount = 0;
                adminModal.style.display = 'flex';
            } else {
                tapTimer = setTimeout(() => { tapCount = 0; }, 800); 
            }
        });
    }

    cancelAdminBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
        adminForm.reset();
        adminError.style.display = 'none';
    });

    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        adminError.style.display = 'none';
        
        const email = document.getElementById('admin-email').value;
        const pwd = document.getElementById('admin-password').value;
        const btn = document.getElementById('login-admin-btn');
        
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, email, pwd);
            
            if (confirm("WARNING: You are authenticated as an Admin. You are about to permanently delete ALL waste logs. Proceed?")) {
                btn.textContent = "Resetting Database...";
                const querySnapshot = await getDocs(collection(db, "wasteLogs"));
                const deletePromises = [];
                querySnapshot.forEach((documentSnap) => {
                    deletePromises.push(deleteDoc(doc(db, "wasteLogs", documentSnap.id)));
                });
                await Promise.all(deletePromises);
                alert("Database successfully reset to zero!");
                window.location.reload(); 
            } else {
                btn.textContent = "Login & Reset";
                btn.disabled = false;
                adminModal.style.display = 'none';
                adminForm.reset();
            }
        } catch (error) {
            adminError.textContent = "Access Denied: Invalid credentials.";
            adminError.style.display = 'block';
            btn.textContent = "Login & Reset";
            btn.disabled = false;
        }
    });
}
