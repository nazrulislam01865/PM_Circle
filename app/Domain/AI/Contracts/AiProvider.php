<?php

namespace App\Domain\AI\Contracts;

interface AiProvider
{
    /** @return array{id:string,model:string,result:array,input_tokens:int,cached_tokens:int,output_tokens:int} */
    public function generate(string $model, string $instructions, array $context,
        array $schema, int $maxOutputTokens, bool $useExternalModeration = true): array;
}
