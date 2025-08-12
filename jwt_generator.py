import secrets
import string
import os

def generate_strong_password(length=32):
    """Generate strong password with letters, digits and safe special chars"""
    # Sử dụng ký tự an toàn cho database passwords
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*-_=+"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_database_secrets():
    """Generate all database passwords for metro system"""
    
    # Core database passwords
    postgres_password = generate_strong_password(24)
    redis_password = generate_strong_password(20)
    
    # Service database passwords
    services = [
        'GATEWAY',
        'AUTH', 
        'USER',
        'TRANSPORT',
        'TICKET',
        'PAYMENT',
        'REPORT',
        'MANAGEMENT',
        'CONTROL'
    ]
    
    service_passwords = {}
    for service in services:
        service_passwords[f'{service}_DB_PASSWORD'] = generate_strong_password(24)
    
    # Generate .env content
    env_content = """# Database and service DB passwords (generated)
# Do NOT commit real secrets. Copy to .env and fill values

# Core Postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD={postgres_password}
POSTGRES_DB=metro_system

# Redis (optional, used by compose)
REDIS_PASSWORD={redis_password}

# Per-service database passwords (used by init_db.sh)
GATEWAY_DB_PASSWORD={gateway_password}
AUTH_DB_PASSWORD={auth_password}
USER_DB_PASSWORD={user_password}
TRANSPORT_DB_PASSWORD={transport_password}
TICKET_DB_PASSWORD={ticket_password}
PAYMENT_DB_PASSWORD={payment_password}
REPORT_DB_PASSWORD={report_password}
MANAGEMENT_DB_PASSWORD={management_password}
CONTROL_DB_PASSWORD={control_password}

# Or use secret files instead (recommended in prod)
# GATEWAY_DB_PASSWORD_FILE=/run/secrets/gateway_db_password
# AUTH_DB_PASSWORD_FILE=/run/secrets/auth_db_password
# USER_DB_PASSWORD_FILE=/run/secrets/user_db_password
# TRANSPORT_DB_PASSWORD_FILE=/run/secrets/transport_db_password
# TICKET_DB_PASSWORD_FILE=/run/secrets/ticket_db_password
# PAYMENT_DB_PASSWORD_FILE=/run/secrets/payment_db_password
# REPORT_DB_PASSWORD_FILE=/run/secrets/report_db_password
# MANAGEMENT_DB_PASSWORD_FILE=/run/secrets/management_db_password
# CONTROL_DB_PASSWORD_FILE=/run/secrets/control_db_password
""".format(
        postgres_password=postgres_password,
        redis_password=redis_password,
        gateway_password=service_passwords['GATEWAY_DB_PASSWORD'],
        auth_password=service_passwords['AUTH_DB_PASSWORD'],
        user_password=service_passwords['USER_DB_PASSWORD'],
        transport_password=service_passwords['TRANSPORT_DB_PASSWORD'],
        ticket_password=service_passwords['TICKET_DB_PASSWORD'],
        payment_password=service_passwords['PAYMENT_DB_PASSWORD'],
        report_password=service_passwords['REPORT_DB_PASSWORD'],
        management_password=service_passwords['MANAGEMENT_DB_PASSWORD'],
        control_password=service_passwords['CONTROL_DB_PASSWORD']
    )
    
    print(env_content)
    
    return {
        'postgres_password': postgres_password,
        'redis_password': redis_password,
        **service_passwords
    }

def save_to_file(content, filename=".env.example"):
    """Save generated passwords to file"""
    try:
        with open(filename, 'w') as f:
            f.write(content)
        print(f"\n✅ Passwords saved to {filename}")
        print(f"📝 Copy {filename} to .env for your project")
    except Exception as e:
        print(f"❌ Error saving file: {e}")

def generate_docker_secrets():
    """Generate Docker secrets files content"""
    services = ['gateway', 'auth', 'user', 'transport', 'ticket', 'payment', 'report', 'management', 'control']
    
    print("\n" + "="*60)
    print("🐳 DOCKER SECRETS (for production)")
    print("="*60)
    
    for service in services:
        password = generate_strong_password(24)
        print(f"# {service}_db_password")
        print(f"echo '{password}' | docker secret create {service}_db_password -")
        print()

if __name__ == "__main__":
    print("🔐 DATABASE PASSWORD GENERATOR FOR METRO SYSTEM")
    print("=" * 60)
    
    # Generate all passwords
    passwords = generate_database_secrets()
    
    # Generate Docker secrets commands
    generate_docker_secrets()
    
    print("\n" + "="*60)
    print("📋 SUMMARY")
    print("="*60)
    print(f"✅ Generated {len(passwords)} secure passwords")
    print("🔒 Each password is 20-24 characters with letters, digits, and special chars")
    print("⚠️  IMPORTANT: Keep these passwords secure!")
    print("📄 Copy the content above to your .env file")
    
    # Option to save to file
    save_choice = input("\n💾 Save to .env.example file? (y/n): ").lower().strip()
    if save_choice in ['y', 'yes']:
        # Re-generate content for saving
        content = generate_database_secrets()
        # This will print again, but we need the formatted string
        # Let's create a cleaner version for file saving
        env_lines = []
        env_lines.append("# Database and service DB passwords (generated)")
        env_lines.append("# Do NOT commit real secrets. Copy to .env and fill values")
        env_lines.append("")
        env_lines.append("# Core Postgres")
        env_lines.append("POSTGRES_USER=postgres")
        env_lines.append(f"POSTGRES_PASSWORD={passwords['postgres_password']}")
        env_lines.append("POSTGRES_DB=metro_system")
        env_lines.append("")
        env_lines.append("# Redis (optional, used by compose)")
        env_lines.append(f"REDIS_PASSWORD={passwords['redis_password']}")
        env_lines.append("")
        env_lines.append("# Per-service database passwords (used by init_db.sh)")
        for key, value in passwords.items():
            if key.endswith('_DB_PASSWORD'):
                env_lines.append(f"{key}={value}")
        
        file_content = "\n".join(env_lines)
        save_to_file(file_content)
    
    print("\n🚀 Ready to use! Your metro system is secured! 🚇")