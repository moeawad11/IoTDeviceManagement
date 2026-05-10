# Place your AWS IoT Core device certificates here.

# These files are gitignored — never commit actual credentials.

#

# Required files (download from AWS IoT Core console when you create a Thing):

# private.pem.key — Device private key

# certificate.pem.crt — Device certificate

# AmazonRootCA1.pem — Amazon Root CA (download from AWS)

#

# How to obtain:

# 1. AWS Console → IoT Core → Manage → Things → Create Thing

# 2. Generate a new certificate and download all three files

# 3. Attach an IoT policy that allows iot:Connect, iot:Publish, iot:Subscribe, iot:Receive

# 4. Place the files in this directory
