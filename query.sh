#!/bin/bash

while true; do
    result=$(curl -s 'https://store.penny-arcade.com/en-au/collections/pins/products/limited-edition-new-years-2026-pin.json' | jq -r '.product | select(.id == 14868352893291) | "\(.updated_at): \(.variants[0].inventory_quantity)"')
    echo "$result"
    
    # Extract quantity from the result
    qty=$(echo "$result" | awk -F': ' '{print $NF}')
    
    # Check if quantity is 0
    if [ "$qty" -eq 0 ]; then
        echo "Quantity reached 0. Terminating."
        break
    fi
    
    # Wait 180 seconds before next check
    sleep 180
done
