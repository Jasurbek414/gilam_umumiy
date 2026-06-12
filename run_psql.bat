ssh -i gilam_server_key.pem ubuntu@43.201.59.31 -o StrictHostKeyChecking=no "sudo -u postgres psql -d gilam_saas -c 'SELECT id, role, phone, company_id FROM users;'"
