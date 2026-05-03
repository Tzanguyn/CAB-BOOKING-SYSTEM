const API_GATEWAY = 'http://localhost:3000';

const createAdmin = async () => {
    try {
        const adminData = {
            email: 'admin@cab-booking.com',
            password: 'AdminPassword123!',
            firstName: 'System',
            lastName: 'Admin',
            role: 'admin',
            phone: '0999999999'
        };

        console.log('--- Creating Admin Account ---');
        console.log(`Email: ${adminData.email}`);
        console.log(`Password: ${adminData.password}`);
        
        const response = await fetch(`${API_GATEWAY}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminData)
        });
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to register');
        }

        console.log('\n✅ Admin account registered successfully!');
        
        if (data.verificationCode) {
            console.log(`Verification Code: ${data.verificationCode}`);
            
            // Auto verify
            const verifyRes = await fetch(`${API_GATEWAY}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: adminData.email,
                    code: data.verificationCode
                })
            });
            
            if (verifyRes.ok) {
                console.log('✅ Account auto-verified.');
            }
        }

        console.log('\n🚀 You can now log in to the Admin Dashboard at http://localhost:5175');
        console.log(`User: ${adminData.email}`);
        console.log(`Pass: ${adminData.password}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

createAdmin();
